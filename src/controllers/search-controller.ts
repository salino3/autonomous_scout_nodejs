import { type Request, type Response } from "express";
import { pool } from "../db.js";
import crypto from "crypto";
import { SerperService } from "../services/serper-service.js";
import { GroqService } from "../services/groq-service.js";
import { ScoringService } from "../services/scoring-service.js";
import { isRealCompanySite } from "../utils/link-filter.js";
import type { AuthRequest } from "../middlewares/auth-middleware.js";

const serperService = new SerperService();
const groqService = new GroqService();
const scoringService = new ScoringService();

export class SearchController {
  static async executeSearch(req: AuthRequest, res: Response) {
    try {
      const { query, requirements, title } = req.body;
      const userId = req.user?.id; // Grabbed from JWT by your middleware!

      if (!query || !userId) {
        return res.status(400).json({ error: "Missing query or unauthorized" });
      }

      // --- STEP 1: INITIALIZE THE TASK ---
      const taskResult = await pool.query(
        `INSERT INTO scout_tasks (user_id, title, keywords, status) 
         VALUES ($1, $2, $3, 'running') RETURNING id`,
        [userId, title || "New Scout Session", query],
      );
      const taskId = taskResult.rows[0].id;

      // --- STEP 2: RUN THE SCOUT (Your existing logic) ---
      const rawResults = await serperService.getSearchResults(query);
      let bestLeads = [];

      for (const item of rawResults) {
        if (!isRealCompanySite(item.link)) continue;

        try {
          const text = await serperService.getWebsiteText(item.link);
          if (!text || text.length < 200) continue;

          const companyDNA = await groqService.extractCompanyInfo(text);
          const score = scoringService.calculateMatchScore(
            companyDNA,
            requirements,
          );

          // --- STEP 3: PERSIST DATA TO DB ---

          // Generate a domain_hash (Standard ID for our companies)
          const domain = new URL(item.link).hostname;
          const domainHash = crypto
            .createHash("md5")
            .update(domain)
            .digest("hex");

          // One query, two tables affected!
          const compositeQuery = `
                  WITH upserted_company AS (
                    INSERT INTO companies_master (domain_hash, name, domain, email, phone, last_scanned_at)
                    VALUES ($1, $2, $3, $4, $5, NOW())
                    ON CONFLICT (domain_hash) DO UPDATE SET 
                      name = EXCLUDED.name,
                      email = EXCLUDED.email,
                      phone = EXCLUDED.phone,
                      last_scanned_at = NOW()
                    RETURNING domain_hash
                  )
                  INSERT INTO user_findings (user_id, task_id, company_domain_hash, score)
                  SELECT $6, $7, domain_hash, $8 FROM upserted_company
                  ON CONFLICT (user_id, task_id, company_domain_hash) DO NOTHING;
                `;

          await pool.query(compositeQuery, [
            domainHash, // $1
            item.title, // $2
            domain, // $3
            companyDNA.email, // $4
            companyDNA.phone, // $5
            userId, // $6
            taskId, // $7
            score, // $8
          ]);

          bestLeads.push({
            title: item.title,
            url: item.link,
            score: score,
            details: companyDNA,
          });
        } catch (err) {
          console.error(`⚠️ Failed to analyze ${item.link}`);
        }
      }

      // --- STEP 4: FINALIZE TASK ---
      await pool.query(
        `UPDATE scout_tasks SET status = 'completed', last_run_at = NOW() WHERE id = $1`,
        [taskId],
      );

      // Return results to frontend
      return res.status(200).json({
        success: true,
        taskId: taskId,
        leads: bestLeads.sort((a, b) => b.score - a.score).slice(0, 5),
      });
    } catch (error: any) {
      console.error("Scout Error:", error);
      return res.status(500).json({ error: error.message });
    }
  }
}

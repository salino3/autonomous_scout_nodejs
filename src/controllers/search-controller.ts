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
      const userId = req.user?.id;

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

      // --- RANDOMIZER LOGIC ---
      const modifiers = [
        "careers",
        "about us",
        "team",
        "jobs",
        "headquarters",
        "tech stack",
        "working at",
        "IT",
      ];

      // 1. Pick a random modifier
      const baseModifier =
        modifiers[Math.floor(Math.random() * modifiers.length)] ?? "";

      // 2. Apply random casing to the modifier (e.g., "Careers", "cAREERS", "careers")
      const randomModifier =
        Math.random() > 0.5
          ? baseModifier.toUpperCase()
          : baseModifier.charAt(0).toUpperCase() +
            baseModifier.slice(1).toLowerCase();

      // Example: "Software Firenze Developer Milano" becomes
      // "Software Firenze Developer Milano careers"
      const randomizedQuery = `${query} ${randomModifier}`;

      // --- STEP 2: RUN THE SCOUT ---
      const rawResults = await serperService.getSearchResults(randomizedQuery);

      // We use 'allFindings' to store everything for the Bulk DB call
      let allFindings: any[] = [];

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

          const domain = new URL(item.link).hostname;
          const domainHash = crypto
            .createHash("md5")
            .update(domain)
            .digest("hex");

          allFindings.push({
            domainHash,
            name: item.title,
            domain,
            email: companyDNA.email || null,
            phone: companyDNA.phone || null,
            score: score,
            details: companyDNA, // Keep this for the final JSON response
          });
        } catch (err) {
          console.error(`⚠️ Failed to analyze ${item.link}`);
        }
      }

      //
      // Filter out duplicates so each domainHash is unique
      const uniqueFindings = Array.from(
        new Map(allFindings.map((item) => [item.domainHash, item])).values(),
      );

      // --- STEP 3: BULK PERSIST (Single trip to DB) ---
      if (uniqueFindings.length > 0) {
        const bulkQuery = `
          WITH data_input AS (
            SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(
              "domainHash" text, 
              "name" text, 
              "domain" text, 
              "email" text, 
              "phone" text, 
              "score" numeric
            )
          ),
          upserted_companies AS (
            INSERT INTO companies_master (domain_hash, name, domain, email, phone, last_scanned_at)
            SELECT "domainHash", "name", "domain", "email", "phone", NOW() FROM data_input
            ON CONFLICT (domain_hash) DO UPDATE SET 
              name = EXCLUDED.name,
              email = EXCLUDED.email,
              phone = EXCLUDED.phone,
              last_scanned_at = NOW()
            RETURNING domain_hash
          )
          INSERT INTO user_findings (user_id, task_id, company_domain_hash, score)
          SELECT $2, $3, "domainHash", "score" FROM data_input
          ON CONFLICT (user_id, task_id, company_domain_hash) DO NOTHING;
        `;

        await pool.query(bulkQuery, [
          JSON.stringify(uniqueFindings), // $1
          userId, // $2
          taskId, // $3
        ]);
      }

      // --- STEP 4: FINALIZE TASK ---
      // TODO: Make this function in DB with SQL executes just after big SQL loop if it is everything fine
      await pool.query(
        `UPDATE scout_tasks SET status = 'completed', last_run_at = NOW() WHERE id = $1`,
        [taskId],
      );

      // Return results (Sorted by score, top 5)
      const topLeads = allFindings
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      return res.status(200).json({
        success: true,
        taskId: taskId,
        count: topLeads.length,
        leads: topLeads,
      });
    } catch (error: any) {
      console.error("Scout Error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  //
  static async getTaskHistory(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      // Fetch all tasks for this user, ordered by the most recent
      const result = await pool.query(
        `SELECT id, title, keywords, status, last_run_at 
       FROM scout_tasks 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
        [userId],
      );

      return res.status(200).json({
        success: true,
        tasks: result.rows,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  //
  static async getTaskResults(req: AuthRequest, res: Response) {
    try {
      const { taskId } = req.params;
      const userId = req.user?.id;

      const query = `
      SELECT 
        cm.name, 
        cm.domain, 
        cm.email, 
        cm.phone, 
        uf.score, 
        uf.status
      FROM user_findings uf
      JOIN companies_master cm ON uf.company_domain_hash = cm.domain_hash
      WHERE uf.task_id = $1 AND uf.user_id = $2
      ORDER BY uf.score DESC
    `;

      const result = await pool.query(query, [taskId, userId]);

      return res.status(200).json({
        success: true,
        leads: result.rows,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

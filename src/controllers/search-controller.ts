import { type Request, type Response } from "express";
import { SerperService } from "../services/serper-service.js";
import { GroqService } from "../services/groq-service.js";
import { ScoringService } from "../services/scoring-service.js";
import { isRealCompanySite } from "../utils/link-filter.js";

const serperService = new SerperService();
const groqService = new GroqService();
const scoringService = new ScoringService();

export class SearchController {
  static async executeSearch(req: Request, res: Response) {
    try {
      const { query, requirements } = req.body;
      if (!query) return res.status(400).json({ error: "Query is required" });

      // 1. Fetch more results to increase our chances (num: 20 or 30)
      const rawResults = await serperService.getSearchResults(query);

      let candidates = [];

      for (const item of rawResults) {
        // A. Filter Directories (MANDATORY - we never want Glassdoor)
        if (!isRealCompanySite(item.link)) continue;

        try {
          console.log(`🔍 Analyzing: ${item.link}`);
          const text = await serperService.getWebsiteText(item.link);
          if (!text || text.length < 200) continue;

          const companyDNA = await groqService.extractCompanyInfo(text);
          const score = scoringService.calculateMatchScore(
            companyDNA,
            requirements,
          );

          // B. Collect EVERY real company, even if score is 0
          candidates.push({
            title: item.title,
            url: item.link,
            score: score,
            contact: {
              email: companyDNA.email,
              phone: companyDNA.phone,
            },
            details: companyDNA,
          });
        } catch (err) {
          console.error(`⚠️ Failed to analyze ${item.link}`);
        }
      }

      // 2. SORT by score (Highest first)
      candidates.sort((a, b) => b.score - a.score);

      // 3. RETURN the top 5 (The "Best of the bunch")
      const bestLeads = candidates.slice(0, 5);

      return res.status(200).json({
        success: true,
        count: bestLeads.length,
        leads: bestLeads,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

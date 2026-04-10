import { type Request, type Response } from "express";
import { SerperService } from "../services/serper-service.js";

const serperService = new SerperService();

export class SearchController {
  static async executeSearch(req: Request, res: Response) {
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      // Get results from Serper
      const results = await serperService.getSearchResults(query);

      return res.status(200).json({
        count: results.length,
        results: results,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

import axios from "axios";
import { CONFIG } from "../config/constants.js";

export interface SerperResult {
  title: string;
  link: string;
  snippet: string;
}

export class SerperService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SERPER_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("SERPER_API_KEY is missing from environment variables");
    }
  }

  /**
   * Fetches organic search results from Serper
   */
  async getSearchResults(
    query: string,
    page: number = 1,
  ): Promise<SerperResult[]> {
    const data = JSON.stringify({
      q: query,
      page: page,
      num: 10, // We take 10 per page to filter through them
    });

    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://google.serper.dev/search",
      headers: {
        "X-API-KEY": this.apiKey,
        "Content-Type": "application/json",
      },
      data: data,
    };

    try {
      const response = await axios.request(config);
      // Serper returns organic results in the 'organic' array
      return response.data.organic.map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
      }));
    } catch (error) {
      console.error("Serper API Error:", error);
      throw new Error("Failed to fetch search results from Serper");
    }
  }
}

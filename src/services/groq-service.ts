import axios from "axios";
import { API_KEYS } from "../config/constants.js";

export interface ExtractedCompanyData {
  email: string | null;
  phone: string | null;
  tech_stack: string[];
  city: string | null;
  work_style: "Remote" | "Hybrid" | "On-site" | "Unknown";
}

export class GroqService {
  private apiKey: string;

  constructor() {
    this.apiKey = API_KEYS.GROQ || "";
  }

  async extractCompanyInfo(websiteText: string): Promise<ExtractedCompanyData> {
    const prompt = `
    SYSTEM: You are an Autonomous Job Scout Agent. 
    CONTEXT: Your goal is to help a human professional find a direct way to contact a company for a job.
    MISSION: 
  - Extract the specific Tech Stack (be granular: e.g., 'React.js', not just 'Web').
  - Find a DIRECT human or info email (ignore 'no-reply').
  - Find the Office Location (Search for addresses in the footer).
  - Determine if they allow 'Remote' or 'Hybrid' or 'On-site' work.
     
      CRITICAL: If the text is about a directory of many companies, focus ONLY on the main company the website belongs to.

      Return ONLY a JSON object with this structure:
      {
        "email": "string or null",
        "phone": "string or null",
        "tech_stack": ["list", "of", "technologies"],
        "city": "string or null",
        "work_style": "Remote" | "Hybrid" | "On-site" | "Unknown"
      }

      Website Text:
      ${websiteText.substring(0, 10000)} // Limiting text to avoid token limits
    `;

    try {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.3-70b-versatile", // Great for extraction
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        },
        { headers: { Authorization: `Bearer ${this.apiKey}` } },
      );

      return JSON.parse(response.data.choices[0].message.content);
    } catch (error) {
      console.error("Groq Extraction Error:", error);
      return {
        email: null,
        phone: null,
        tech_stack: [],
        city: null,
        work_style: "Unknown",
      };
    }
  }
}

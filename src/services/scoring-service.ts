import type { ExtractedCompanyData } from "./groq-service.js";

export interface UserRequirements {
  tech: string[];
  location: string[];
  style: string[];
}

export class ScoringService {
  // Importance weights (must add up to 1.0)
  private readonly WEIGHTS = {
    tech: 0.6, // Tech is most important
    location: 0.2,
    style: 0.2,
  };

  public calculateMatchScore(
    company: ExtractedCompanyData,
    user: UserRequirements,
  ): number {
    // 1. Tech Score
    const matchedTech = company.tech_stack.filter((t) =>
      user.tech.some(
        (req) =>
          t.toLowerCase().includes(req.toLowerCase()) ||
          req.toLowerCase().includes(t.toLowerCase()),
      ),
    );
    const techScore =
      user.tech.length > 0 ? matchedTech.length / user.tech.length : 0;

    // 2. Location Score (Binary: Is the company city in the user's list?)
    const locationMatch = user.location.some(
      (l) => company.city && l.toLowerCase() === company.city.toLowerCase(),
    )
      ? 1
      : 0;

    // 3. Style Score (Binary: Is the work style in the user's list?)
    const styleMatch = user.style.some(
      (s) => s.toLowerCase() === company.work_style.toLowerCase(),
    )
      ? 1
      : 0;

    // Final Weighted Calculation
    const total =
      techScore * this.WEIGHTS.tech +
      locationMatch * this.WEIGHTS.location +
      styleMatch * this.WEIGHTS.style;

    return parseFloat(total.toFixed(3));
  }
}

import { pool } from "../db.js";

export interface UserDTO {
  id: string;
  username: string;
  email: string;
  role: string;
}

export class AuthUserService {
  async createUser(
    username: string,
    email: string,
    password_hash: string,
    role: string = "client",
  ): Promise<UserDTO> {
    try {
      const query = `
        INSERT INTO users (username, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, username, email, role
      `;

      const values = [username, email, password_hash, role];
      const result = await pool.query(query, values);

      return result.rows[0];
    } catch (error: any) {
      // Check for PostgreSQL Unique Violation error code
      if (error.code === "23505") {
        // Checking 'error.detail' to see if it was the email unique violation
        if (error.detail.includes("email")) {
          throw new Error("This email is already registered.");
        }
      }

      // If it's a different error, throw a generic message
      console.error("Database Error:", error);
      throw new Error("An unexpected error occurred during signup.");
    }
  }
}

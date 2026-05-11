import { type Request, type Response } from "express";
import { pool } from "../db.js";

export type UserRole = "client" | "admin" | "company";

export interface UsersRequest {
  id: string;
  username: string;
  email: string;
  password_hash?: string;
  role: UserRole;
  is_active: boolean;
}

export class UsersControllers {
  static async getAllUsers(
    req: Request,
    res: Response,
  ): Promise<Response<UsersRequest[] | { error: string }>> {
    try {
      const query: string = `
 SELECT COALESCE(
          json_agg(to_jsonb(users) - 'password_hash' - 'created_at' - 'updated_at'), 
          '[]'::json
        ) AS users_list 
        FROM users;`;

      const result = await pool.query(query);

      return res.status(200).json(result.rows[0].users_list);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

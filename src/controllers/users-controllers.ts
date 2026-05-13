import { type Request, type Response } from "express";
import { pool } from "../db.js";
import type { AuthRequest } from "../middlewares/auth-middleware.js";

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

  //
  static async desactiveUser(
    req: AuthRequest,
    res: Response,
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!id) {
        return res.status(400).json({ error: "User id is mandatory" });
      }

      if (!userId) {
        return res
          .status(401)
          .json({ error: "Access denied. Unauthorized action." });
      }

      if (userId !== id) {
        return res
          .status(401)
          .json({ error: "Access denied. Unauthorized action." });
      }

      const query: string = `
      UPDATE users SET is_active = false WHERE id = $1
    `;
      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: `User with id ${id} not found` });
      }

      return res
        .status(200)
        .json({ message: `User with id ${id} deleted successfully` });
    } catch (error) {
      return res.status(500).json({
        message: "Internal server error",
      });
    }
  }
}

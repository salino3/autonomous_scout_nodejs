import { type Request, type Response } from "express";
import { AuthUserService } from "../services/auth-service.js";

const authService = new AuthUserService();

export class AuthController {
  static async signup(req: Request, res: Response) {
    try {
      const { username, email, password, role } = req.body;

      // Basic validation before hitting the service
      if (!username || !email || !password) {
        return res
          .status(400)
          .json({ error: "Email, username and password are required" });
      }

      const newUser = await authService.createUser(
        username,
        email,
        password,
        role,
      );

      return res.status(201).json(newUser);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}

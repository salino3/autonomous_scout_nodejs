import jwt from "jsonwebtoken";
import { type Request, type Response } from "express";
import { AuthUserService } from "../services/auth-service.js";
import { CONFIG } from "../config/constants.js";

const authService = new AuthUserService();

let regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export class AuthController {
  static async signup(req: Request, res: Response) {
    try {
      const { username, email, password, repeatPassword, role } = req.body;

      // Basic validation before hitting the service
      if (!username || !email || !password || !repeatPassword) {
        return res.status(400).json({ error: "All parameters are required" });
      }

      if (password !== repeatPassword) {
        return res
          .status(400)
          .send("'Password' and 'Repeat password' don't match");
      }

      if (!regex.test(email)) {
        return res.status(405).send("Invalid Email address");
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

  //
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).send("All parameters are required");
      }

      if (!regex.test(email)) {
        return res.status(405).send("Invalid Email address");
      }

      const user = await authService.loginUser(email, password);

      const token = jwt.sign(
        { id: user.id, role: user.role, email: user.email },
        CONFIG.SECRET_KEY as string,
        { expiresIn: "1h" },
      );

      // 1. Define Cookie Options
      const cookieOptions = {
        httpOnly: true, // cookie cannot be accessed via document.cookie
        secure: process.env.NODE_ENV === "production", // Only over HTTPS in prod
        sameSite: "lax" as const, // Protects against CSRF
        expires: new Date(Date.now() + 3600 * 1000),
      };

      res.cookie("user_session", token, cookieOptions);

      return res.status(200).json({
        success: true,
        message: "Login successful",
        user,
      });
    } catch (error: any) {
      return res.status(401).json({ error: error.message });
    }
  }
}

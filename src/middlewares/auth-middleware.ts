import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { CONFIG } from "../config/constants.js";

// Extend Express Request type to include the user data
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
    username: string;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  let token = req.cookies.user_session;

  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1]; // Get the string after "Bearer ", for mobile usually
  }

  if (!token) {
    return res.status(401).json({ error: "Access denied. Please login." });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, CONFIG.SECRET_KEY as string) as any;

    // Attach user data to the request object
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
      username: decoded.username,
    };

    next();
  } catch (error) {
    res.clearCookie(CONFIG.COOKIES_NAME as string);
    return res
      .status(403)
      .json({ error: "Invalid or expired session. Please login again." });
  }
};

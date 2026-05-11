import { Router } from "express";
import { UsersControllers } from "../controllers/users-controllers.js";
import {
  authMiddleware,
  roleMiddleware,
} from "../middlewares/auth-middleware.js";

const router = Router();

router.get(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "company"]),
  UsersControllers.getAllUsers,
);

export default router;

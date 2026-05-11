import { Router } from "express";
import { UsersControllers } from "../controllers/users-controllers.js";
import { authMiddleware } from "../middlewares/auth-middleware.js";

const router = Router();

router.get("/", authMiddleware, UsersControllers.getAllUsers);

export default router;

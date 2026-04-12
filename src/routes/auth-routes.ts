import { Router } from "express";
import { AuthController } from "../controllers/auth-controller.js";

const router = Router();

router.post("/signup", AuthController.signup);

export default router;

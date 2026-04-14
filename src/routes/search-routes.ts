import { Router } from "express";
import { SearchController } from "../controllers/search-controller.js";
import { authMiddleware } from "../middlewares/auth-middleware.js";

const router = Router();

router.post("/search", authMiddleware, SearchController.executeSearch);

router.get("/search-history", authMiddleware, SearchController.getTaskHistory);

router.get(
  "/search-task/:taskId",
  authMiddleware,
  SearchController.getTaskResults,
);

export default router;

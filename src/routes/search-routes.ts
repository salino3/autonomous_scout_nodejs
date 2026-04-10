import { Router } from "express";
import { SearchController } from "../controllers/search-controller.js";

const router = Router();

router.post("/search", SearchController.executeSearch);

export default router;

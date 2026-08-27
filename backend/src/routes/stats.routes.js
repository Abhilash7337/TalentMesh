import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler.js";
import { getStats } from "../services/stats.service.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await getStats());
  })
);

export default router;

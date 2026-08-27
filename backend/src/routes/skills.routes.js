import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler.js";
import { getTrendingSkills } from "../services/trending.service.js";

const router = Router();

router.get(
  "/trending",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 15, 50);
    res.json(await getTrendingSkills({ skillId: req.query.skillId, limit }));
  })
);

export default router;

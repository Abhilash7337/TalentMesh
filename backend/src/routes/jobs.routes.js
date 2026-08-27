import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler.js";
import { listJobs, getJobById } from "../services/job.service.js";
import { getRecommendedCandidates } from "../services/recommendation.service.js";
import { getReferralPaths } from "../services/referral.service.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const skip = Number(req.query.skip) || 0;
    const { status, q } = req.query;
    res.json(await listJobs({ limit, skip, status, q }));
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const job = await getJobById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  })
);

router.get(
  "/:id/recommended-candidates",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    res.json(await getRecommendedCandidates(req.params.id, { limit }));
  })
);

router.get(
  "/:id/referral-paths",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    res.json(await getReferralPaths(req.params.id, { limit }));
  })
);

export default router;

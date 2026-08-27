import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler.js";
import { listCandidates, getCandidateById } from "../services/candidate.service.js";
import { getSkillGap } from "../services/skillGap.service.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const skip = Number(req.query.skip) || 0;
    res.json(await listCandidates({ limit, skip }));
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const candidate = await getCandidateById(req.params.id);
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });
    res.json(candidate);
  })
);

router.get(
  "/:id/skill-gap/:jobId",
  asyncHandler(async (req, res) => {
    res.json(await getSkillGap(req.params.id, req.params.jobId));
  })
);

export default router;

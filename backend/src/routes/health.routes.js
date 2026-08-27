import { Router } from "express";
import { verifyConnection } from "../db/connection.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    await verifyConnection();
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(503).json({ status: "error", db: "unreachable", message: err.message });
  }
});

export default router;

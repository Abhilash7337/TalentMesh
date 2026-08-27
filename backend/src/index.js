import express from "express";
import cors from "cors";
import "dotenv/config";
import { verifyConnection } from "./db/connection.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Full route set (candidates, jobs, recommendations, etc.) lands in Phase 3.
app.get("/health", async (_req, res) => {
  try {
    await verifyConnection();
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(503).json({ status: "error", db: "unreachable", message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`TalentMesh backend listening on http://localhost:${PORT}`);
});

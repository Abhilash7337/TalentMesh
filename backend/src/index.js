import express from "express";
import cors from "cors";
import "dotenv/config";
import healthRoutes from "./routes/health.routes.js";
import candidatesRoutes from "./routes/candidates.routes.js";
import jobsRoutes from "./routes/jobs.routes.js";
import skillsRoutes from "./routes/skills.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/health", healthRoutes);
app.use("/candidates", candidatesRoutes);
app.use("/jobs", jobsRoutes);
app.use("/skills", skillsRoutes);
app.use("/stats", statsRoutes);

// Must be registered last: 404 for unmatched routes, then the error handler
// (4-arg signature) that turns "CognoDB unreachable" into a clean 503 instead
// of a crash for every route above.
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`TalentMesh backend listening on http://localhost:${PORT}`);
});

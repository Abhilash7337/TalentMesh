import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { Candidates } from "./pages/Candidates.jsx";
import { CandidateDetail } from "./pages/CandidateDetail.jsx";
import { Jobs } from "./pages/Jobs.jsx";
import { JobDetail } from "./pages/JobDetail.jsx";
import { SkillGap } from "./pages/SkillGap.jsx";

export default function App() {
  return (
    <BrowserRouter basename="/TalentMesh">
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="candidates" element={<Candidates />} />
          <Route path="candidates/:id" element={<CandidateDetail />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="jobs/:id" element={<JobDetail />} />
          <Route path="skill-gap" element={<SkillGap />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

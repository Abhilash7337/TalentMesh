import { Link, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useFetch } from "../hooks/useFetch.js";
import { LoadingState, EmptyState, ErrorState } from "../components/StateViews.jsx";
import { SkillBadge } from "../components/SkillBadge.jsx";
import { MatchScore } from "../components/MatchScore.jsx";

export function CandidateDetail() {
  const { id } = useParams();
  const candidate = useFetch(() => api.candidate(id), [id]);
  const recommendedJobs = useFetch(() => api.recommendedJobs(id, { limit: 8 }), [id]);

  if (candidate.loading) return <LoadingState label="Loading candidate…" />;
  if (candidate.error) return <ErrorState error={candidate.error} />;
  if (!candidate.data) return <EmptyState title="Candidate not found" />;

  const c = candidate.data;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{c.name}</h1>
        <p className="page-subtitle">
          {c.headline} · {c.location} · {c.yearsExperience} years experience
        </p>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ marginTop: 0 }}>Skills</h3>
        {c.skills.length === 0 ? (
          <EmptyState title="No skills on file" />
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {c.skills.map((s) => (
              <SkillBadge key={s.skillId} name={s.name} category={s.category} proficiency={s.proficiency} />
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Jobs they're a strong match for</h3>
        {recommendedJobs.loading && <LoadingState label="Finding matching jobs…" />}
        {recommendedJobs.error && <ErrorState error={recommendedJobs.error} />}
        {!recommendedJobs.loading && !recommendedJobs.error && recommendedJobs.data?.length === 0 && (
          <EmptyState title="No strong matches yet" message="This candidate's skills don't overlap much with open roles." />
        )}
        {!recommendedJobs.loading && !recommendedJobs.error && recommendedJobs.data?.length > 0 && (
          <div className="list-stack">
            {recommendedJobs.data.map((job) => (
              <div key={job.jobId} className="card">
                <div className="entity-row" style={{ marginBottom: "0.5rem" }}>
                  <div>
                    <Link to={`/jobs/${job.jobId}`} className="entity-name">
                      {job.title}
                    </Link>
                    <div className="entity-meta">
                      {job.seniority} · {job.location} ·{" "}
                      <span className={`badge ${job.status === "open" ? "badge-success" : "badge-neutral"}`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                </div>
                <MatchScore percent={job.matchPercent} breakdown={job.matchBreakdown} />
                <div style={{ marginTop: "0.5rem" }}>
                  <Link to={`/skill-gap?candidate=${c.id}&job=${job.jobId}`} className="btn">
                    View skill gap
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

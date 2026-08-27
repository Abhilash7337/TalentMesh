import { Link, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useFetch } from "../hooks/useFetch.js";
import { LoadingState, EmptyState, ErrorState } from "../components/StateViews.jsx";
import { SkillBadge } from "../components/SkillBadge.jsx";
import { MatchScore } from "../components/MatchScore.jsx";

export function JobDetail() {
  const { id } = useParams();
  const job = useFetch(() => api.job(id), [id]);
  const recommendedCandidates = useFetch(() => api.recommendedCandidates(id, { limit: 8 }), [id]);
  const referralPaths = useFetch(() => api.referralPaths(id, { limit: 5 }), [id]);

  if (job.loading) return <LoadingState label="Loading job…" />;
  if (job.error) return <ErrorState error={job.error} />;
  if (!job.data) return <EmptyState title="Job not found" />;

  const j = job.data;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{j.title}</h1>
        <p className="page-subtitle">
          {j.company?.name} · {j.location} · {j.seniority} ·{" "}
          <span className={`badge ${j.status === "open" ? "badge-success" : "badge-neutral"}`}>{j.status}</span>
        </p>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ marginTop: 0 }}>Required skills</h3>
        {j.requiredSkills.length === 0 ? (
          <EmptyState title="No required skills on file" />
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {j.requiredSkills.map((s) => (
              <SkillBadge key={s.skillId} name={s.name} category={s.category} />
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ marginTop: 0 }}>Recommended candidates</h3>
        <p className="entity-meta" style={{ marginTop: "-0.5rem" }}>
          Ranked by direct skill overlap plus partial credit for related skills — click "Why?" to see the breakdown.
        </p>
        {recommendedCandidates.loading && <LoadingState label="Ranking candidates…" />}
        {recommendedCandidates.error && <ErrorState error={recommendedCandidates.error} />}
        {!recommendedCandidates.loading && !recommendedCandidates.error && recommendedCandidates.data?.length === 0 && (
          <EmptyState title="No strong matches yet" message="No candidates overlap with this job's required skills." />
        )}
        {!recommendedCandidates.loading && !recommendedCandidates.error && recommendedCandidates.data?.length > 0 && (
          <div className="list-stack">
            {recommendedCandidates.data.map((cand) => (
              <div key={cand.candidateId} className="card">
                <div className="entity-row" style={{ marginBottom: "0.5rem" }}>
                  <div>
                    <Link to={`/candidates/${cand.candidateId}`} className="entity-name">
                      {cand.name}
                    </Link>
                    <div className="entity-meta">{cand.headline}</div>
                  </div>
                </div>
                <MatchScore percent={cand.matchPercent} breakdown={cand.matchBreakdown} />
                <div style={{ marginTop: "0.5rem" }}>
                  <Link to={`/skill-gap?candidate=${cand.candidateId}&job=${j.id}`} className="btn">
                    View skill gap
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Referral paths</h3>
        <p className="entity-meta" style={{ marginTop: "-0.5rem" }}>
          Candidates with a warm path in, through someone who's worked at {j.company?.name}.
        </p>
        {referralPaths.loading && <LoadingState label="Tracing referral paths…" />}
        {referralPaths.error && <ErrorState error={referralPaths.error} />}
        {!referralPaths.loading && !referralPaths.error && referralPaths.data?.length === 0 && (
          <EmptyState title="No referral paths found" message="No candidates share prior employment history with anyone at this company." />
        )}
        {!referralPaths.loading && !referralPaths.error && referralPaths.data?.length > 0 && (
          <div className="list-stack">
            {referralPaths.data.map((r) => (
              <div key={r.candidateId} className="card">
                <div className="entity-row" style={{ marginBottom: "0.5rem" }}>
                  <Link to={`/candidates/${r.candidateId}`} className="entity-name">
                    {r.name}
                  </Link>
                  <span className="entity-meta">{r.headline}</span>
                </div>
                {r.paths.map((p, i) => (
                  <div className="path-chain" key={i} style={{ marginTop: "0.25rem" }}>
                    <span className="path-node">{r.name}</span>
                    <span className="path-arrow">worked at →</span>
                    <span className="path-node">{p.sharedCompanyName}</span>
                    <span className="path-arrow">← worked with</span>
                    <span className="path-node">{p.colleagueName}</span>
                    <span className="path-arrow">→ works at →</span>
                    <span className="path-node">{j.company?.name}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useFetch } from "../hooks/useFetch.js";
import { LoadingState, EmptyState, ErrorState } from "../components/StateViews.jsx";

function Picker({ label, items, valueId, onChange, getLabel }) {
  const [filter, setFilter] = useState("");
  const filtered = filter
    ? items.filter((item) => getLabel(item).toLowerCase().includes(filter.toLowerCase()))
    : items;

  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <label className="entity-meta" style={{ display: "block", marginBottom: "0.25rem" }}>
        {label}
      </label>
      <input
        className="input"
        placeholder={`Filter ${label.toLowerCase()}…`}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ marginBottom: "0.5rem" }}
      />
      <select className="select" value={valueId} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Select {label.toLowerCase()} —</option>
        {filtered.map((item) => (
          <option key={item.id} value={item.id}>
            {getLabel(item)}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SkillGap() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [candidateId, setCandidateId] = useState(searchParams.get("candidate") || "");
  const [jobId, setJobId] = useState(searchParams.get("job") || "");

  const candidates = useFetch(() => api.candidates({ limit: 250 }), []);
  const jobs = useFetch(() => api.jobs({ limit: 100 }), []);

  const gap = useFetch(
    () => (candidateId && jobId ? api.skillGap(candidateId, jobId) : Promise.resolve(null)),
    [candidateId, jobId]
  );

  function updateCandidate(value) {
    setCandidateId(value);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      value ? next.set("candidate", value) : next.delete("candidate");
      return next;
    });
  }
  function updateJob(value) {
    setJobId(value);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      value ? next.set("job", value) : next.delete("job");
      return next;
    });
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Skill Gap Analysis</h1>
        <p className="page-subtitle">Pick a candidate and a job to see what's missing, and what's a head start.</p>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        {(candidates.loading || jobs.loading) && <LoadingState label="Loading candidates and jobs…" />}
        {(candidates.error || jobs.error) && <ErrorState error={candidates.error || jobs.error} />}
        {candidates.data && jobs.data && (
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            <Picker
              label="Candidate"
              items={candidates.data}
              valueId={candidateId}
              onChange={updateCandidate}
              getLabel={(c) => `${c.name} — ${c.headline}`}
            />
            <Picker
              label="Job"
              items={jobs.data}
              valueId={jobId}
              onChange={updateJob}
              getLabel={(j) => `${j.title} — ${j.companyName}`}
            />
          </div>
        )}
      </div>

      {!candidateId || !jobId ? (
        <EmptyState title="Pick a candidate and a job" message="The skill-gap analysis appears once both are selected." />
      ) : (
        <>
          {gap.loading && <LoadingState label="Analyzing skill gap…" />}
          {gap.error && <ErrorState error={gap.error} />}
          {gap.data && (
            <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
              <div className="card">
                <h3 style={{ marginTop: 0 }}>
                  <span className="badge badge-success">Already has</span>
                </h3>
                {gap.data.alreadyHas.length === 0 ? (
                  <p className="entity-meta">None of the required skills yet.</p>
                ) : (
                  gap.data.alreadyHas.map((s) => (
                    <div key={s.skillId} className="entity-meta" style={{ marginBottom: "0.5rem" }}>
                      <strong>{s.skillName}</strong> ({s.importance}) — proficiency {s.proficiency}/5
                    </div>
                  ))
                )}
              </div>

              <div className="card">
                <h3 style={{ marginTop: 0 }}>
                  <span className="badge badge-warning">Head start</span>
                </h3>
                {gap.data.headStartGaps.length === 0 ? (
                  <p className="entity-meta">No adjacent-skill head starts.</p>
                ) : (
                  gap.data.headStartGaps.map((s) => (
                    <div key={s.skillId} className="entity-meta" style={{ marginBottom: "0.5rem" }}>
                      <strong>{s.skillName}</strong> ({s.importance}) — via <strong>{s.headStart.viaSkillName}</strong>{" "}
                      ({s.headStart.hopDistance} hop{s.headStart.hopDistance > 1 ? "s" : ""} away)
                    </div>
                  ))
                )}
              </div>

              <div className="card">
                <h3 style={{ marginTop: 0 }}>
                  <span className="badge badge-danger">Hard gaps</span>
                </h3>
                {gap.data.gaps.length === 0 ? (
                  <p className="entity-meta">No hard gaps — nice.</p>
                ) : (
                  gap.data.gaps.map((s) => (
                    <div key={s.skillId} className="entity-meta" style={{ marginBottom: "0.5rem" }}>
                      <strong>{s.skillName}</strong> ({s.importance}) — nothing adjacent either
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

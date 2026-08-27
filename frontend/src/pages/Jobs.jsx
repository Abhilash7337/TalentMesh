import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useFetch } from "../hooks/useFetch.js";
import { LoadingState, EmptyState, ErrorState } from "../components/StateViews.jsx";

export function Jobs() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const { data, loading, error } = useFetch(() => api.jobs({ q: query, status, limit: 30 }), [query, status]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Jobs</h1>
        <p className="page-subtitle">Search by title, filter by status.</p>
      </div>

      <div className="toolbar">
        <input className="input" placeholder="Search jobs…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="select" style={{ maxWidth: 160 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {loading && <LoadingState label="Loading jobs…" />}
      {error && <ErrorState error={error} />}
      {!loading && !error && data?.length === 0 && (
        <EmptyState title="No jobs match yet" message="Try a different search term or status filter." />
      )}
      {!loading && !error && data?.length > 0 && (
        <div className="list-stack">
          {data.map((j) => (
            <Link to={`/jobs/${j.id}`} className="card card-link" key={j.id}>
              <div className="entity-row">
                <div>
                  <div className="entity-name">{j.title}</div>
                  <div className="entity-meta">
                    {j.companyName} · {j.location}
                  </div>
                </div>
                <span className={`badge ${j.status === "open" ? "badge-success" : "badge-neutral"}`}>{j.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

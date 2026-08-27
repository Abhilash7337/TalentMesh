import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useFetch } from "../hooks/useFetch.js";
import { LoadingState, EmptyState, ErrorState } from "../components/StateViews.jsx";

export function Candidates() {
  const [query, setQuery] = useState("");
  const { data, loading, error } = useFetch(() => api.candidates({ q: query, limit: 30 }), [query]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Candidates</h1>
        <p className="page-subtitle">Search by name or headline.</p>
      </div>

      <div className="toolbar">
        <input
          className="input"
          placeholder="Search candidates…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && <LoadingState label="Loading candidates…" />}
      {error && <ErrorState error={error} />}
      {!loading && !error && data?.length === 0 && (
        <EmptyState title="No candidates match yet" message="Try a different search term." />
      )}
      {!loading && !error && data?.length > 0 && (
        <div className="list-stack">
          {data.map((c) => (
            <Link to={`/candidates/${c.id}`} className="card card-link" key={c.id}>
              <div className="entity-row">
                <div>
                  <div className="entity-name">{c.name}</div>
                  <div className="entity-meta">{c.headline}</div>
                </div>
                <div className="entity-meta">
                  {c.location} · {c.yearsExperience} yrs exp
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

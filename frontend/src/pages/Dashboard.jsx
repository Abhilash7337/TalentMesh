import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useFetch } from "../hooks/useFetch.js";
import { LoadingState, ErrorState } from "../components/StateViews.jsx";

export function Dashboard() {
  const { data, loading, error } = useFetch(() => api.stats(), []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">TalentMesh</h1>
        <p className="page-subtitle">A candidate ↔ skill ↔ job matching graph, backed by CognoDB.</p>
      </div>

      {loading && <LoadingState label="Loading stats…" />}
      {error && <ErrorState error={error} />}
      {data && (
        <div className="grid grid-4" style={{ marginBottom: "2rem" }}>
          <div className="card stat-card">
            <div className="stat-value">{data.candidates}</div>
            <div className="stat-label">Candidates</div>
          </div>
          <div className="card stat-card">
            <div className="stat-value">{data.jobs}</div>
            <div className="stat-label">Open jobs</div>
          </div>
          <div className="card stat-card">
            <div className="stat-value">{data.skills}</div>
            <div className="stat-label">Tracked skills</div>
          </div>
          <div className="card stat-card">
            <div className="stat-value">{data.companies}</div>
            <div className="stat-label">Companies</div>
          </div>
        </div>
      )}

      <div className="grid grid-2">
        <Link to="/candidates" className="card card-link">
          <h3 style={{ margin: "0 0 0.5rem" }}>Search candidates</h3>
          <p className="entity-meta">Browse candidates, see their skills, and find jobs they're a strong match for.</p>
        </Link>
        <Link to="/jobs" className="card card-link">
          <h3 style={{ margin: "0 0 0.5rem" }}>Search jobs</h3>
          <p className="entity-meta">Browse open roles and see recommended candidates, ranked and explained.</p>
        </Link>
      </div>
    </div>
  );
}

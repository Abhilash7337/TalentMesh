export function LoadingState({ label = "Loading…" }) {
  return <div className="state-block">{label}</div>;
}

export function EmptyState({ title, message }) {
  return (
    <div className="state-block">
      <div className="state-title">{title}</div>
      {message && <div>{message}</div>}
    </div>
  );
}

export function ErrorState({ error }) {
  const isDbUnavailable = error?.isDbUnavailable;
  return (
    <div className="state-block error">
      <div className="state-title">
        {isDbUnavailable ? "Can't reach the database right now" : "Something went wrong"}
      </div>
      <div>
        {isDbUnavailable
          ? "TalentMesh's data lives in CognoDB, and we couldn't connect. Please try again shortly."
          : error?.message || "An unexpected error occurred."}
      </div>
    </div>
  );
}

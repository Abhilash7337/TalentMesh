const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Distinguishes "the database is unreachable" (a state the UI should show a
// friendly, specific message for) from any other error. A 503 from the
// backend's error middleware, or the fetch call itself failing (backend not
// running at all), both count as "can't reach the data right now."
export class ApiError extends Error {
  constructor(message, { status, isDbUnavailable } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.isDbUnavailable = isDbUnavailable;
  }
}

async function request(path, params) {
  const url = new URL(API_BASE + path);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  let res;
  try {
    res = await fetch(url);
  } catch {
    throw new ApiError("Could not reach the TalentMesh server. Is the backend running?", {
      isDbUnavailable: true,
    });
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    // no/invalid JSON body — fall through, res.ok check below handles it
  }

  if (!res.ok) {
    throw new ApiError(body?.message || body?.error || res.statusText, {
      status: res.status,
      isDbUnavailable: res.status === 503,
    });
  }
  return body;
}

export const api = {
  stats: () => request("/stats"),
  candidates: (params) => request("/candidates", params),
  candidate: (id) => request(`/candidates/${id}`),
  recommendedJobs: (candidateId, params) => request(`/candidates/${candidateId}/recommended-jobs`, params),
  skillGap: (candidateId, jobId) => request(`/candidates/${candidateId}/skill-gap/${jobId}`),
  jobs: (params) => request("/jobs", params),
  job: (id) => request(`/jobs/${id}`),
  recommendedCandidates: (jobId, params) => request(`/jobs/${jobId}/recommended-candidates`, params),
  referralPaths: (jobId, params) => request(`/jobs/${jobId}/referral-paths`, params),
  trending: (params) => request("/skills/trending", params),
};

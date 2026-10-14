import api, { getApiErrorMessage, getResponseData } from "./api";

const EMPTY_RESULTS = () => ({ query: "", documents: [], workspaces: [], people: [] });

const searchService = {
  async global(query, limit = 8, options = {}) {
    const normalizedQuery = String(query ?? "").trim();
    const parsedLimit = Number(limit);
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.max(1, Math.min(Math.floor(parsedLimit), 50))
      : 8;

    if (normalizedQuery.length < 2) {
      return { ...EMPTY_RESULTS(), query: normalizedQuery };
    }

    try {
      const response = await api.get("/search", {
        params: { q: normalizedQuery, limit: safeLimit },
        signal: options.signal,
      });
      const data = getResponseData(response, {});
      return {
        ...EMPTY_RESULTS(),
        ...(data && typeof data === "object" ? data : {}),
        query: data?.query || normalizedQuery,
        documents: Array.isArray(data?.documents) ? data.documents : [],
        workspaces: Array.isArray(data?.workspaces) ? data.workspaces : [],
        people: Array.isArray(data?.people) ? data.people : [],
      };
    } catch (error) {
      error.searchMessage = getApiErrorMessage(error, "Search is temporarily unavailable.");
      throw error;
    }
  },
};

export default searchService;

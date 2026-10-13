import api from './api';

const searchService = {
  async global(query, limit = 8) {
    const q = String(query || '').trim();
    if (q.length < 2) return { query: q, documents: [], workspaces: [], people: [] };
    const response = await api.get('/search', { params: { q, limit } });
    return response?.data?.data || response?.data || { query: q, documents: [], workspaces: [], people: [] };
  },
};

export default searchService;

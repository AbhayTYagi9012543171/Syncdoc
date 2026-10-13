import api, { getResponseData } from './api';
const userService = {
  async list(params = {}) { const r = await api.get('/users', { params }); return getResponseData(r, { users: [], pagination: {} }); },
  async stats() { const r = await api.get('/users/stats'); return getResponseData(r, null); },
  async updateRole(id, role) { const r = await api.put(`/users/${id}/role`, { role }); return getResponseData(r, null); },
};
export default userService;

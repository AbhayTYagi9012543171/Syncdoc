import api, { getResponseData } from './api';
const analyticsService = { async get(days = 30) { const response = await api.get('/analytics', { params: { days } }); return getResponseData(response, null); } };
export default analyticsService;

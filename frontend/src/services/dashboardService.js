import api, {
  getApiErrorMessage,
  getResponseData,
} from './api';

const ENDPOINT = '/dashboard';

function handleError(error) {
  error.dashboardMessage = getApiErrorMessage(
    error,
    'Unable to load dashboard data.'
  );
  return error;
}

const dashboardService = {
  async get() {
    try {
      const response = await api.get(ENDPOINT);
      return getResponseData(response, null);
    } catch (error) {
      throw handleError(error);
    }
  },
};

export default dashboardService;

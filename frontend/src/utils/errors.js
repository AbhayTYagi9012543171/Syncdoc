/** Normalize API, network, validation and unknown errors for UI messages. */
export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const candidates = [
    error?.response?.data?.message,
    error?.response?.data?.error,
    error?.data?.message,
    error?.message,
    typeof error === "string" ? error : null,
  ];
  const message = candidates.find((value) => typeof value === "string" && value.trim());
  if (message) return message.trim();
  if (error?.code === "ERR_NETWORK") return "Unable to reach the server. Check your connection and try again.";
  if (error?.code === "ECONNABORTED") return "The request timed out. Please try again.";
  return fallback;
}

export function isCancellationError(error) {
  return error?.code === "ERR_CANCELED" || error?.name === "CanceledError" || error?.name === "AbortError";
}

export function isUnauthorizedError(error) {
  return Number(error?.response?.status) === 401 || Number(error?.status) === 401;
}

export function isForbiddenError(error) {
  return Number(error?.response?.status) === 403 || Number(error?.status) === 403;
}

export function isNetworkError(error) {
  return !error?.response && (error?.code === "ERR_NETWORK" || error?.message === "Network Error");
}

export default getErrorMessage;


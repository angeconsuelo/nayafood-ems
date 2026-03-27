const rawApiUrl = process.env.REACT_APP_API_URL;

const normalizeApiUrl = (value) => {
  if (!value) {
    return null;
  }

  return value.endsWith('/') ? value.slice(0, -1) : value;
};

export const API_URL =
  normalizeApiUrl(rawApiUrl) ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000/api'
    : `${window.location.origin}/api`);

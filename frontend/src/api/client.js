import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
  withCredentials: true,
});

let _token = null;

export function setToken(token) {
  _token = token;
}

// Attach Bearer token to every request when available
client.interceptors.request.use((config) => {
  if (_token) {
    config.headers["Authorization"] = `Bearer ${_token}`;
  }
  return config;
});

export default client;

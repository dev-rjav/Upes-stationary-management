import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

client.interceptors.response.use(
  res => res,
  err => {
    const is401 = err.response?.status === 401;
    const isAuthCheck = err.config?.url?.includes('/auth/');
    const alreadyOnLogin = window.location.pathname === '/login';
    if (is401 && !isAuthCheck && !alreadyOnLogin) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;

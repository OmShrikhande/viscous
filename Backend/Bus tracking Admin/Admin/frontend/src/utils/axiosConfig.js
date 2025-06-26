import axios from 'axios';

// Add a request interceptor
axios.interceptors.request.use(
  config => {
    // Get the token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add it to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle authentication errors
axios.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    // If we get a 401 Unauthorized response, redirect to login
    if (error.response && error.response.status === 401) {
      console.log('Authentication error, redirecting to login');
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default axios;
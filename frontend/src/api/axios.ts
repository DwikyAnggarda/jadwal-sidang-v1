import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000', // Ganti jika backend beda host/port
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;

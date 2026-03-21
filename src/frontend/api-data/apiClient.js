import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

// Strip null / undefined / empty string params before every request
apiClient.interceptors.request.use((config) => {
  if (config.params) {
    config.params = Object.fromEntries(
      Object.entries(config.params).filter(([, v]) => v != null && v !== '')
    )
  }
  return config
})

export default apiClient
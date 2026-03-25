import axios from 'axios'

/** API client instance for making HTTP requests. Defines how to interact with the API endpoints. */
const apiClient = axios.create({
    baseURL: 'http://localhost:8000',
    headers: { 'Content-Type': 'application/json' },
})

// Clean up request params by removing any keys with null or empty string values before sending the request
apiClient.interceptors.request.use((config) => {
    if (config.params) {
        config.params = Object.fromEntries(
            Object.entries(config.params).filter(([, v]) => v != null && v !== '')
        )
    }
    return config
})

export default apiClient
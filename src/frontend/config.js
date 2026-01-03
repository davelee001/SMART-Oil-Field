// API Configuration
// Toggle between direct Python API or TypeScript gateway
const API_CONFIG = {
    // Set to true to use TypeScript backend as gateway, false for direct Python API
    USE_GATEWAY: false,

    // API endpoints
    PYTHON_API: 'http://127.0.0.1:8000',
    TS_GATEWAY: 'http://127.0.0.1:3000',

    // Get the base URL based on configuration
    getBaseUrl() {
        return this.USE_GATEWAY ? this.TS_GATEWAY : this.PYTHON_API;
    },

    // Get full API URL
    getApiUrl(endpoint) {
        return `${this.getBaseUrl()}${endpoint}`;
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
}

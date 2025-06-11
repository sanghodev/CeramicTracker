// Environment detection and API configuration
export function getApiBaseUrl(): string {
  // Always use relative URLs for both development and production
  // The Vite dev server proxies to the backend automatically
  return '';
}

export function isDeployedEnvironment(): boolean {
  return import.meta.env.PROD || window.location.hostname.includes('.replit.app');
}

export function getEnvironmentInfo() {
  return {
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    isDeployed: isDeployedEnvironment(),
    hostname: window.location.hostname,
    apiBaseUrl: getApiBaseUrl()
  };
}

// Log environment info for debugging
console.log('Client environment:', getEnvironmentInfo());
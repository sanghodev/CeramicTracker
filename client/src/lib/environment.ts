// Environment detection and API configuration
export function getApiBaseUrl(): string {
  // In production (deployed), use relative URLs
  if (import.meta.env.PROD) {
    return '';
  }
  
  // In development, use localhost
  return 'http://localhost:5000';
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
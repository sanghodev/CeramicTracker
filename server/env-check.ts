export function validateEnvironment() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
  }

  console.log('Environment validation passed');
  return true;
}

export function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    hasDbUrl: !!process.env.DATABASE_URL,
    dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + '...',
    port: process.env.PORT || '5000',
    platform: process.platform,
    nodeVersion: process.version
  };
}
// Environment variable validation for deployment
export function validateEnvironment() {
  const required = ['DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate DATABASE_URL format
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl?.startsWith('postgresql://')) {
    console.error('Invalid DATABASE_URL format');
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
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Enhanced Neon configuration for deployment stability
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;
neonConfig.pipelineTLS = false;

// Log database connection status for debugging
console.log('Database connection status:', {
  hasUrl: !!process.env.DATABASE_URL,
  urlPrefix: process.env.DATABASE_URL?.substring(0, 25) + '...',
  environment: process.env.NODE_ENV || 'development'
});

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is missing');
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Deployment-optimized connection pool settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: process.env.NODE_ENV === 'production' ? 5 : 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 15000,
  allowExitOnIdle: false
});

// Test pool connection on startup
pool.connect()
  .then(client => {
    console.log('Database pool connection test successful');
    client.release();
  })
  .catch(err => {
    console.error('Database pool connection test failed:', err.message);
  });

export const db = drizzle({ client: pool, schema });
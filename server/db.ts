import { Pool, neonConfig, neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
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

let db: any;
let pool: Pool | null = null;

// Try WebSocket connection first, fallback to HTTP if needed
try {
  console.log('Attempting WebSocket database connection...');
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: process.env.NODE_ENV === 'production' ? 5 : 10,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 15000,
    allowExitOnIdle: false
  });
  
  db = drizzle({ client: pool, schema });
  console.log('WebSocket database connection established');
  
  // Test the connection
  pool.connect()
    .then(client => {
      console.log('Database pool connection test successful');
      client.release();
    })
    .catch(err => {
      console.error('Database pool connection test failed, trying HTTP fallback:', err.message);
      // Switch to HTTP connection
      const sql = neon(process.env.DATABASE_URL!);
      db = drizzleHttp(sql, { schema });
      console.log('Switched to HTTP database connection');
    });
    
} catch (error: any) {
  console.error('WebSocket connection failed, using HTTP connection:', error.message);
  const sql = neon(process.env.DATABASE_URL);
  db = drizzleHttp(sql, { schema });
  console.log('HTTP database connection established');
}

export { db, pool };
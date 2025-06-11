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
let connectionType: 'websocket' | 'http' = 'websocket';

async function createDatabaseConnection() {
  const dbUrl = process.env.DATABASE_URL!;
  
  try {
    console.log('Attempting WebSocket database connection...');
    pool = new Pool({ 
      connectionString: dbUrl,
      max: process.env.NODE_ENV === 'production' ? 3 : 8,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: false
    });
    
    // Test the connection synchronously
    const testClient = await pool.connect();
    await testClient.query('SELECT 1');
    testClient.release();
    
    db = drizzle({ client: pool, schema });
    connectionType = 'websocket';
    console.log('WebSocket database connection established and tested');
    
  } catch (error: any) {
    console.error('WebSocket connection failed, switching to HTTP:', error.message);
    
    // Clean up failed pool
    if (pool) {
      try { await pool.end(); } catch {}
      pool = null;
    }
    
    // Use HTTP connection as fallback
    const sql = neon(dbUrl);
    db = drizzleHttp(sql, { schema });
    connectionType = 'http';
    console.log('HTTP database connection established');
    
    // Test HTTP connection
    try {
      await db.execute('SELECT 1');
      console.log('HTTP database connection tested successfully');
    } catch (httpError: any) {
      console.error('HTTP database connection test failed:', httpError.message);
      throw new Error('Both WebSocket and HTTP database connections failed');
    }
  }
}

// Initialize connection
createDatabaseConnection().catch(err => {
  console.error('Critical: Database connection initialization failed:', err.message);
  process.exit(1);
});

export { db, pool, connectionType };
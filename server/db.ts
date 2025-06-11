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

let db: any = null;
let pool: Pool | null = null;
let connectionType: 'websocket' | 'http' = 'http';
let isInitialized = false;

async function createDatabaseConnection() {
  if (isInitialized && db) {
    return db;
  }

  const dbUrl = process.env.DATABASE_URL!;
  
  // Always use HTTP connection for deployment reliability
  if (process.env.NODE_ENV === 'production') {
    console.log('Production environment: Using HTTP database connection');
    const sql = neon(dbUrl);
    db = drizzleHttp(sql, { schema });
    connectionType = 'http';
    
    try {
      await db.execute('SELECT 1');
      console.log('HTTP database connection tested successfully');
      isInitialized = true;
      return db;
    } catch (error: any) {
      console.error('HTTP database connection failed:', error.message);
      throw error;
    }
  }
  
  // Development: Try WebSocket first, fallback to HTTP
  try {
    console.log('Development environment: Attempting WebSocket connection...');
    pool = new Pool({ 
      connectionString: dbUrl,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
      allowExitOnIdle: false
    });
    
    const testClient = await pool.connect();
    await testClient.query('SELECT 1');
    testClient.release();
    
    db = drizzle({ client: pool, schema });
    connectionType = 'websocket';
    console.log('WebSocket database connection established');
    isInitialized = true;
    return db;
    
  } catch (error: any) {
    console.error('WebSocket failed, using HTTP fallback:', error.message);
    
    if (pool) {
      try { await pool.end(); } catch {}
      pool = null;
    }
    
    const sql = neon(dbUrl);
    db = drizzleHttp(sql, { schema });
    connectionType = 'http';
    
    try {
      await db.execute('SELECT 1');
      console.log('HTTP fallback connection successful');
      isInitialized = true;
      return db;
    } catch (httpError: any) {
      console.error('All database connections failed:', httpError.message);
      throw new Error('Database connection failed completely');
    }
  }
}

// Initialize connection and export promise
const dbInitPromise = createDatabaseConnection();

// Export database instance getter to ensure it's initialized
export const getDb = async () => {
  await dbInitPromise;
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

export { db, pool, connectionType, dbInitPromise };
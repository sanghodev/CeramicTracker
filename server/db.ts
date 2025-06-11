import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";

console.log('Database initialization:', {
  hasUrl: !!process.env.DATABASE_URL,
  environment: process.env.NODE_ENV || 'development'
});

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is missing');
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Create database connection with enhanced error handling
let db: any = null;

function createConnection() {
  console.log('[DB] Creating database connection...');
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required');
    }
    const sql = neon(databaseUrl);
    db = drizzle(sql, { schema });
    console.log('[DB] Database connection established with HTTP client');
    return db;
  } catch (error: any) {
    console.error('[DB] Failed to create connection:', error);
    throw error;
  }
}

// Initialize connection
db = createConnection();

// Test the connection
async function testConnection() {
  try {
    console.log('[DB] Testing connection...');
    await db.execute('SELECT 1 as test');
    console.log('[DB] Connection test successful');
  } catch (error: any) {
    console.error('[DB] Connection test failed:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
  }
}

testConnection();

export { db };
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";

// HTTP-based fallback connection for deployment environments
export function createFallbackDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  console.log('Using HTTP-based database connection (fallback)');
  
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema });
}

// Test database connectivity
export async function testDbConnection(db: any) {
  try {
    const result = await db.execute('SELECT 1 as test');
    console.log('Database connection test passed:', result);
    return true;
  } catch (error: any) {
    console.error('Database connection test failed:', error.message);
    return false;
  }
}
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

// Simplified database connection - use HTTP only for reliability
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

console.log('Database connection established with HTTP client');

// Test the connection
db.execute('SELECT 1 as test')
  .then(() => console.log('Database connection test successful'))
  .catch(err => console.error('Database connection test failed:', err.message));
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Database connection optimization
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum connection limit
  idleTimeoutMillis: 30000, // Release idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // 5 second connection timeout
});

export const db = drizzle({ client: pool, schema });
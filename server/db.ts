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

// 데이터베이스 연결 최적화
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // 최대 연결 수 제한
  idleTimeoutMillis: 30000, // 30초 후 유휴 연결 해제
  connectionTimeoutMillis: 5000, // 5초 연결 타임아웃
});

export const db = drizzle({ client: pool, schema });
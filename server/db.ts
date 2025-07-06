import { createConnection } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "@shared/schema";

// Create MySQL connection function
export async function createMySQLConnection() {
  try {
    const connection = await createConnection({
      host: process.env.MYSQL_HOST || 'sg2plzcpnl505849.prod.sin2.secureserver.net',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'pottery_studio',
    });
    
    return drizzle(connection, { schema, mode: 'default' });
  } catch (error) {
    console.error('MySQL connection failed:', error);
    throw error;
  }
}

// Export a placeholder - actual connection will be created in storage.ts
export let db: ReturnType<typeof drizzle>;
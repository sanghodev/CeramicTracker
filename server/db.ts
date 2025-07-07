
import { createPool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "@shared/schema";

let globalPool: any = null;
let globalDb: any = null;

// Create MySQL connection pool with better configuration
export async function createMySQLConnection() {
  const config = {
    host: process.env.GODADDY_MYSQL_HOST || process.env.MYSQL_HOST || 'sg2plzcpnl505849.prod.sin2.secureserver.net',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.GODADDY_MYSQL_USER || process.env.MYSQL_USER || 'root',
    password: process.env.GODADDY_MYSQL_PASSWORD || process.env.MYSQL_PASSWORD || '',
    database: process.env.GODADDY_MYSQL_DATABASE || process.env.MYSQL_DATABASE || 'pottery_studio',
    // Connection pool settings
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    // Keep connections alive
    keepAliveInitialDelay: 0,
    enableKeepAlive: true,
    // Handle disconnections
    handleDisconnects: true
  };

  if (!globalPool) {
    try {
      globalPool = createPool(config);
      
      // Test the pool connection
      const connection = await globalPool.getConnection();
      console.log("✓ MySQL connection pool created successfully");
      connection.release();
      
      globalDb = drizzle(globalPool, { schema, mode: 'default' });
      
      // Handle pool errors
      globalPool.on('error', (err: any) => {
        console.error('MySQL pool error:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
          console.log('Pool connection lost, will auto-reconnect...');
        }
      });
      
    } catch (error) {
      console.error('Failed to create MySQL connection pool:', error);
      throw error;
    }
  }

  return globalDb;
}

// Export database instance type
export type Database = ReturnType<typeof drizzle>;

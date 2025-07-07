import { createConnection } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "@shared/schema";

// Create MySQL connection function
export async function createMySQLConnection() {
  let connection;
  try {
    connection = await createConnection({
      host: process.env.GODADDY_MYSQL_HOST || process.env.MYSQL_HOST || 'sg2plzcpnl505849.prod.sin2.secureserver.net',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.GODADDY_MYSQL_USER || process.env.MYSQL_USER || 'root',
      password: process.env.GODADDY_MYSQL_PASSWORD || process.env.MYSQL_PASSWORD || '',
      database: process.env.GODADDY_MYSQL_DATABASE || process.env.MYSQL_DATABASE || 'pottery_studio',
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true
    });

    // Handle connection errors
    connection.on('error', (err) => {
      console.error('Database connection error:', err);
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Attempting to reconnect...');
        connection = null;
      }
    });

    console.log("✓ MySQL database connection successful");


    return drizzle(connection, { schema, mode: 'default' });
  } catch (error) {
    console.error('MySQL connection failed:', error);
    throw error;
  }
}

// Export a placeholder - actual connection will be created in storage.ts
export let db: ReturnType<typeof drizzle>;
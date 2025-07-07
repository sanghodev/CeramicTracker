
import { createConnection } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "@shared/schema";

let globalConnection: any = null;
let globalDb: any = null;

// Create MySQL connection function with proper retry logic
export async function createMySQLConnection() {
  const config = {
    host: process.env.GODADDY_MYSQL_HOST || process.env.MYSQL_HOST || 'sg2plzcpnl505849.prod.sin2.secureserver.net',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.GODADDY_MYSQL_USER || process.env.MYSQL_USER || 'root',
    password: process.env.GODADDY_MYSQL_PASSWORD || process.env.MYSQL_PASSWORD || '',
    database: process.env.GODADDY_MYSQL_DATABASE || process.env.MYSQL_DATABASE || 'pottery_studio',
  };

  async function connect(retries = 3): Promise<any> {
    try {
      const connection = await createConnection(config);

      // Handle connection errors with auto-reconnect
      connection.on('error', async (err) => {
        console.error('MySQL connection error:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
          console.log('Connection lost, attempting to reconnect...');
          globalConnection = null;
          globalDb = null;
          try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            globalConnection = await connect(3);
            globalDb = drizzle(globalConnection, { schema, mode: 'default' });
          } catch (reconnectError) {
            console.error('Failed to reconnect:', reconnectError);
          }
        }
      });

      console.log("✓ MySQL database connection successful");
      return connection;
    } catch (error) {
      if (retries > 0) {
        console.log(`Connection failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return connect(retries - 1);
      }
      console.error('MySQL connection failed after retries:', error);
      throw error;
    }
  }

  // Always create a fresh connection if none exists or if it's closed
  if (!globalConnection) {
    globalConnection = await connect();
    globalDb = drizzle(globalConnection, { schema, mode: 'default' });
  }

  return globalDb;
}

// Export database instance type
export type Database = ReturnType<typeof drizzle>;


import { defineConfig } from "drizzle-kit";

if (!process.env.MYSQL_HOST) {
  console.warn("MYSQL_HOST not set, using default configuration");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.GODADDY_MYSQL_HOST || process.env.MYSQL_HOST || 'sg2plzcpnl505849.prod.sin2.secureserver.net',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.GODADDY_MYSQL_USER || process.env.MYSQL_USER || 'root',
    password: process.env.GODADDY_MYSQL_PASSWORD || process.env.MYSQL_PASSWORD || '',
    database: process.env.GODADDY_MYSQL_DATABASE || process.env.MYSQL_DATABASE || 'pottery_studio',
  },
});

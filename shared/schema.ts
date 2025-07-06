import { mysqlTable, text, serial, timestamp, varchar } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const customers = mysqlTable("customers", {
  id: serial("id").primaryKey(),
  customerId: varchar("customer_id", { length: 20 }).notNull().unique(), // Format: YYMMDD-ProgramType-Number (e.g., 250611-P-001)
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  workDate: timestamp("work_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("waiting"),
  programType: varchar("program_type", { length: 50 }).notNull().default("painting"), // "painting", "one_time_ceramic", "advanced_ceramic"
  workImage: varchar("work_image", { length: 255 }), // Image filename
  customerImage: varchar("customer_image", { length: 255 }), // Customer info image filename
  isGroup: text("is_group").default("false").notNull(), // "true" or "false"
  groupId: varchar("group_id", { length: 20 }), // Format: YYMMDD-XYZ (e.g., 250606-2A01)
  groupSize: text("group_size"), // Store as text to avoid type issues
  contactStatus: varchar("contact_status", { length: 20 }).notNull().default("not_contacted"), // "not_contacted", "contacted", "confirmed"
  storageLocation: varchar("storage_location", { length: 100 }), // Where artwork is stored
  pickupStatus: varchar("pickup_status", { length: 20 }).notNull().default("not_picked_up"), // "not_picked_up", "picked_up"
  notes: text("notes"), // Staff notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  customerId: true,
  createdAt: true,
}).extend({
  workDate: z.string().transform((str) => new Date(str)),
  workImage: z.string().nullable().optional(),
  customerImage: z.string().nullable().optional(),
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// Keep the existing users table
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

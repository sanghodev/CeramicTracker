import { customers, users, type Customer, type InsertCustomer, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, desc, asc, count } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Customer methods
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomers(): Promise<Customer[]>;
  searchCustomers(query: string): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, updates: Partial<InsertCustomer>): Promise<Customer | undefined>;
  updateCustomerStatus(id: number, status: string): Promise<Customer | undefined>;
}

// Helper function to generate unique customer ID using Eastern Time
function generateCustomerId(workDate: Date, programType?: string): string {
  // Convert to Eastern Time
  const easternDate = new Date(workDate.toLocaleString("en-US", {timeZone: "America/New_York"}));
  
  const year = easternDate.getFullYear().toString().slice(-2);
  const month = (easternDate.getMonth() + 1).toString().padStart(2, '0');
  const day = easternDate.getDate().toString().padStart(2, '0');
  
  // Program type codes
  const programCodes: Record<string, string> = {
    'painting': 'P',
    'one_time_ceramic': 'C1',
    'advanced_ceramic': 'C2'
  };
  
  const programCode = programCodes[programType || 'painting'] || 'P';
  const datePrefix = `${year}${month}${day}`;
  
  // Generate a random 3-digit number for uniqueness
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `${datePrefix}-${programCode}-${randomSuffix}`;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Customer methods
  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    return await db.select().from(customers).where(
      or(
        ilike(customers.name, `%${query}%`),
        ilike(customers.phone, `%${query}%`),
        ilike(customers.email, `%${query}%`),
        ilike(customers.customerId, `%${query}%`)
      )
    ).orderBy(desc(customers.createdAt));
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    // Generate unique customer ID
    const customerId = generateCustomerId(insertCustomer.workDate, insertCustomer.programType);
    
    const [customer] = await db
      .insert(customers)
      .values({
        ...insertCustomer,
        customerId
      })
      .returning();
    return customer;
  }

  async updateCustomer(id: number, updates: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [customer] = await db
      .update(customers)
      .set(updates)
      .where(eq(customers.id, id))
      .returning();
    return customer || undefined;
  }

  async updateCustomerStatus(id: number, status: string): Promise<Customer | undefined> {
    const [customer] = await db
      .update(customers)
      .set({ status })
      .where(eq(customers.id, id))
      .returning();
    return customer || undefined;
  }
}

export const storage = new DatabaseStorage();

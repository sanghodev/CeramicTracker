import { customers, users, type Customer, type InsertCustomer, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, desc, gte, lte, and, count } from "drizzle-orm";

export interface CustomerFilter {
  dateRange?: 'today' | 'week' | 'month' | 'all';
  status?: string;
  programType?: string;
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Customer methods
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomers(): Promise<Customer[]>;
  getCustomersPaginated(page: number, limit: number, filter?: CustomerFilter): Promise<PaginatedResult<Customer>>;
  getTodayCustomers(): Promise<Customer[]>;
  searchCustomers(query: string): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, updates: Partial<InsertCustomer>): Promise<Customer | undefined>;
  updateCustomerStatus(id: number, status: string): Promise<Customer | undefined>;
}

// Helper function to generate unique customer ID
function generateCustomerId(workDate: Date, programType?: string): string {
  const year = workDate.getFullYear().toString().slice(-2);
  const month = (workDate.getMonth() + 1).toString().padStart(2, '0');
  const day = workDate.getDate().toString().padStart(2, '0');
  
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

  async getCustomersPaginated(page: number, limit: number, filter?: CustomerFilter): Promise<PaginatedResult<Customer>> {
    const offset = (page - 1) * limit;
    let whereConditions: any[] = [];

    // Date range filtering
    if (filter?.dateRange && filter.dateRange !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (filter.dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      whereConditions.push(gte(customers.createdAt, startDate));
    }

    // Status filtering
    if (filter?.status) {
      whereConditions.push(eq(customers.status, filter.status));
    }

    // Program type filtering
    if (filter?.programType) {
      whereConditions.push(eq(customers.programType, filter.programType));
    }

    // Search filtering
    if (filter?.search) {
      whereConditions.push(
        or(
          ilike(customers.name, `%${filter.search}%`),
          ilike(customers.phone, `%${filter.search}%`),
          ilike(customers.email, `%${filter.search}%`),
          ilike(customers.customerId, `%${filter.search}%`)
        )
      );
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(customers)
      .where(whereClause);

    // Get paginated data
    const data = await db
      .select()
      .from(customers)
      .where(whereClause)
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data,
      total: totalResult.count,
      page,
      limit,
      totalPages: Math.ceil(totalResult.count / limit)
    };
  }

  async getTodayCustomers(): Promise<Customer[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await db
      .select()
      .from(customers)
      .where(gte(customers.createdAt, today))
      .orderBy(desc(customers.createdAt));
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

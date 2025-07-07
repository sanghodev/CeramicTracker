import { customers, users, type Customer, type InsertCustomer, type User, type InsertUser } from "@shared/schema";
import { createMySQLConnection } from "./db";
import { eq, ilike, or, desc, gte, lte, lt, and, count } from "drizzle-orm";

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
  deleteCustomer(id: number): Promise<boolean>;
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
  private db: any;

  constructor(db: any) {
    this.db = db;
  }
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser);
    const [user] = await this.db.select().from(users).where(eq(users.id, result.insertId));
    return user;
  }

  // Customer methods
  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await this.db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomers(): Promise<Customer[]> {
    return await this.db.select().from(customers).orderBy(desc(customers.createdAt));
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
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(customers)
      .where(whereClause);

    // Get paginated data
    const data = await this.db
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
    // Get latest 10 customers (more practical than date filtering due to timezone issues)
    return await this.db
      .select()
      .from(customers)
      .orderBy(desc(customers.createdAt))
      .limit(10);
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    return await this.db.select().from(customers).where(
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

    const result = await this.db.insert(customers).values({
      ...insertCustomer,
      customerId
    });

    // Get the newly created customer by customerId (more reliable than insertId)
    const [customer] = await this.db.select().from(customers).where(eq(customers.customerId, customerId));

    if (!customer) {
      throw new Error("Failed to retrieve created customer");
    }

    return customer;
  }

  async updateCustomer(id: number, updates: Partial<InsertCustomer>): Promise<Customer | undefined> {
    await this.db.update(customers).set(updates).where(eq(customers.id, id));
    const [customer] = await this.db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async updateCustomerStatus(id: number, status: string): Promise<Customer | undefined> {
    await this.db.update(customers).set({ status }).where(eq(customers.id, id));
    const [customer] = await this.db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const result = await this.db.delete(customers).where(eq(customers.id, id));
    return result.affectedRows > 0;
  }
}

// In-Memory Storage as fallback
class MemoryStorage implements IStorage {
  private customers: Customer[] = [];
  private users: User[] = [];
  private idCounter = 1;

  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(u => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.idCounter++,
      username: insertUser.username,
      password: insertUser.password
    };
    this.users.push(user);
    return user;
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.find(c => c.id === id);
  }

  async getCustomers(): Promise<Customer[]> {
    return [...this.customers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getCustomersPaginated(page: number, limit: number, filter?: CustomerFilter): Promise<PaginatedResult<Customer>> {
    let filteredCustomers = [...this.customers];

    // Apply filters
    if (filter?.search) {
      const search = filter.search.toLowerCase();
      filteredCustomers = filteredCustomers.filter(c =>
        c.name.toLowerCase().includes(search) ||
        c.phone.toLowerCase().includes(search) ||
        c.email?.toLowerCase().includes(search) ||
        c.customerId?.toLowerCase().includes(search)
      );
    }

    if (filter?.status) {
      filteredCustomers = filteredCustomers.filter(c => c.status === filter.status);
    }

    if (filter?.programType) {
      filteredCustomers = filteredCustomers.filter(c => c.programType === filter.programType);
    }

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

      filteredCustomers = filteredCustomers.filter(c => 
        new Date(c.workDate) >= startDate
      );
    }

    // Sort by creation date (newest first)
    filteredCustomers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = filteredCustomers.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const data = filteredCustomers.slice(offset, offset + limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages
    };
  }

  async getTodayCustomers(): Promise<Customer[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.customers.filter(c => {
      const workDate = new Date(c.workDate);
      return workDate >= today && workDate < tomorrow;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    const search = query.toLowerCase();
    return this.customers.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.phone.toLowerCase().includes(search) ||
      c.email?.toLowerCase().includes(search) ||
      c.customerId?.toLowerCase().includes(search)
    );
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const customerId = generateCustomerId(new Date(insertCustomer.workDate), insertCustomer.programType);
    const customer: Customer = {
      id: this.idCounter++,
      customerId: customerId,
      name: insertCustomer.name,
      phone: insertCustomer.phone,
      email: insertCustomer.email || null,
      workDate: insertCustomer.workDate,
      status: insertCustomer.status || 'waiting',
      programType: insertCustomer.programType || 'painting',
      workImage: insertCustomer.workImage || null,
      customerImage: insertCustomer.customerImage || null,
      isGroup: insertCustomer.isGroup || 'false',
      groupId: insertCustomer.groupId || null,
      groupSize: insertCustomer.groupSize || null,
      contactStatus: insertCustomer.contactStatus || 'not_contacted',
      storageLocation: insertCustomer.storageLocation || null,
      pickupStatus: insertCustomer.pickupStatus || 'not_picked_up',
      notes: insertCustomer.notes || null,
      createdAt: new Date()
    };
    this.customers.push(customer);
    return customer;
  }

  async updateCustomer(id: number, updates: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const index = this.customers.findIndex(c => c.id === id);
    if (index === -1) return undefined;

    this.customers[index] = { ...this.customers[index], ...updates };
    return this.customers[index];
  }

  async updateCustomerStatus(id: number, status: string): Promise<Customer | undefined> {
    const index = this.customers.findIndex(c => c.id === id);
    if (index === -1) return undefined;

    this.customers[index].status = status;
    return this.customers[index];
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const index = this.customers.findIndex(c => c.id === id);
    if (index === -1) return false;

    this.customers.splice(index, 1);
    return true;
  }
}

// Initialize storage with runtime fallback
async function initializeStorage(): Promise<IStorage> {
  try {
    const db = await createMySQLConnection();
    const dbStorage = new DatabaseStorage(db);
    // Test database connection
    await dbStorage.getCustomers();
    console.log('✓ MySQL database connection successful');
    return dbStorage;
  } catch (error) {
    console.log('⚠ MySQL database not available, using memory storage');
    console.log('Error:', error instanceof Error ? error.message : String(error));
    return new MemoryStorage();
  }
}

// Create storage instance
let storagePromise: Promise<IStorage> | null = null;

export async function getStorage(): Promise<IStorage> {
  if (!storagePromise) {
    storagePromise = initializeStorage();
  }
  return storagePromise;
}

// For backwards compatibility
export const storage = {
  async getUser(id: number) { return (await getStorage()).getUser(id); },
  async getUserByUsername(username: string) { return (await getStorage()).getUserByUsername(username); },
  async createUser(user: InsertUser) { return (await getStorage()).createUser(user); },
  async getCustomer(id: number) { return (await getStorage()).getCustomer(id); },
  async getCustomers() { return (await getStorage()).getCustomers(); },
  async getCustomersPaginated(page: number, limit: number, filter?: CustomerFilter) { 
    return (await getStorage()).getCustomersPaginated(page, limit, filter); 
  },
  async getTodayCustomers() { return (await getStorage()).getTodayCustomers(); },
  async searchCustomers(query: string) { return (await getStorage()).searchCustomers(query); },
  async createCustomer(customer: InsertCustomer) { return (await getStorage()).createCustomer(customer); },
  async updateCustomer(id: number, updates: Partial<InsertCustomer>) { 
    return (await getStorage()).updateCustomer(id, updates); 
  },
  async updateCustomerStatus(id: number, status: string) { 
    return (await getStorage()).updateCustomerStatus(id, status); 
  },
  async deleteCustomer(id: number) { 
    return (await getStorage()).deleteCustomer(id); 
  }
};
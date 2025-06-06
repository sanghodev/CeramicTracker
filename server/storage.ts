import { type Customer, type InsertCustomer, type User, type InsertUser } from "@shared/schema";

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

export class MemStorage implements IStorage {
  private customers: Customer[] = [];
  private users: User[] = [];
  private nextCustomerId = 1;
  private nextUserId = 1;
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.nextUserId++,
      ...insertUser,
    };
    this.users.push(user);
    return user;
  }

  // Customer methods
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.find(customer => customer.id === id);
  }

  async getCustomers(): Promise<Customer[]> {
    return [...this.customers].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    const lowerQuery = query.toLowerCase();
    return this.customers.filter(customer =>
      customer.name.toLowerCase().includes(lowerQuery) ||
      customer.phone.toLowerCase().includes(lowerQuery) ||
      (customer.email && customer.email.toLowerCase().includes(lowerQuery))
    ).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const customer: Customer = {
      id: this.nextCustomerId++,
      name: insertCustomer.name,
      phone: insertCustomer.phone,
      email: insertCustomer.email ?? null,
      workDate: insertCustomer.workDate,
      status: insertCustomer.status || "waiting",
      workImage: insertCustomer.workImage ?? null,
      createdAt: new Date(),
    };
    this.customers.push(customer);
    return customer;
  }

  async updateCustomer(id: number, updates: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const customer = this.customers.find(c => c.id === id);
    if (customer) {
      Object.assign(customer, updates);
      return customer;
    }
    return undefined;
  }

  async updateCustomerStatus(id: number, status: string): Promise<Customer | undefined> {
    const customer = this.customers.find(c => c.id === id);
    if (customer) {
      customer.status = status;
      return customer;
    }
    return undefined;
  }
}

export const storage = new MemStorage();

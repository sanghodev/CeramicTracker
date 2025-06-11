import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check
  app.get("/api/health", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json({
        status: 'healthy',
        database: 'connected',
        customerCount: customers.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message
      });
    }
  });

  // Get all customers
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to fetch customers',
        message: error.message
      });
    }
  });

  // Search customers
  app.get("/api/customers/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Search query is required" });
      }
      const customers = await storage.searchCustomers(query);
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({
        error: 'Search failed',
        message: error.message
      });
    }
  });

  // Create customer
  app.post("/api/customers", async (req, res) => {
    try {
      const result = insertCustomerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: "Invalid customer data",
          details: result.error.format()
        });
      }

      const customer = await storage.createCustomer(result.data);
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to create customer',
        message: error.message
      });
    }
  });

  // Update customer
  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid customer ID" });
      }

      const updates = req.body;
      const customer = await storage.updateCustomer(id, updates);
      
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      res.json(customer);
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to update customer',
        message: error.message
      });
    }
  });

  // Update customer status
  app.patch("/api/customers/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid customer ID" });
      }

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const customer = await storage.updateCustomerStatus(id, status);
      
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      res.json(customer);
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to update customer status',
        message: error.message
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
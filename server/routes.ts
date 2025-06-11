import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      // Test database connection
      const customers = await storage.getCustomers();
      res.json({ 
        status: "healthy", 
        database: "connected",
        customerCount: customers.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ 
        status: "unhealthy", 
        database: "disconnected",
        error: error?.message || String(error),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get all customers with cache headers for optimization
  app.get("/api/customers", async (req, res) => {
    try {
      // Set cache headers for client-side caching optimization
      res.set('Cache-Control', 'public, max-age=300'); // 5 minute cache
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      const customers = await storage.getCustomers();
      console.log(`Fetched ${customers.length} customers from database`);
      res.json(customers);
    } catch (error: any) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers", error: error?.message || String(error) });
    }
  });

  // Search customers
  app.get("/api/customers/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const customers = await storage.searchCustomers(q);
      res.json(customers);
    } catch (error) {
      console.error("Error searching customers:", error);
      res.status(500).json({ message: "Failed to search customers" });
    }
  });

  // Get single customer
  app.get("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid customer ID" });
      }

      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  // Create new customer
  app.post("/api/customers", async (req, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  // Update customer status
  app.patch("/api/customers/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid customer ID" });
      }

      const { status } = req.body;
      if (!status || typeof status !== "string") {
        return res.status(400).json({ message: "Status is required" });
      }

      const customer = await storage.updateCustomerStatus(id, status);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.json(customer);
    } catch (error) {
      console.error("Error updating customer status:", error);
      res.status(500).json({ message: "Failed to update customer status" });
    }
  });

  // Update customer information
  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid customer ID" });
      }

      const validatedData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(id, validatedData);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  // Google Vision API text detection endpoint
  app.post("/api/vision/text", async (req, res) => {
    try {
      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: "Image data is required" });
      }

      const apiKey = process.env.GOOGLE_VISION_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Google Vision API key not configured" });
      }

      // Call Google Vision API
      const visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: image
                },
                features: [
                  {
                    type: 'TEXT_DETECTION',
                    maxResults: 10
                  }
                ]
              }
            ]
          })
        }
      );

      if (!visionResponse.ok) {
        const errorText = await visionResponse.text();
        console.error('Google Vision API error:', errorText);
        return res.status(500).json({ error: "Vision API request failed" });
      }

      const visionResult = await visionResponse.json();
      
      if (visionResult.responses && visionResult.responses[0]) {
        const textAnnotations = visionResult.responses[0].textAnnotations;
        
        if (textAnnotations && textAnnotations.length > 0) {
          // First annotation contains all detected text
          const extractedText = textAnnotations[0].description;
          res.json({ text: extractedText });
        } else {
          res.json({ text: null });
        }
      } else {
        res.json({ text: null });
      }
    } catch (error) {
      console.error("Vision API error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

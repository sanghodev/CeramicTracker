import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import express from "express";
import archiver from "archiver";

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage_multer = multer.memoryStorage();
const upload = multer({ 
  storage: storage_multer,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  }
});

// Helper function to save base64 image with structured naming and folder organization
async function saveBase64Image(base64Data: string, type: 'work' | 'customer', customerId?: string, workDate?: string, isGroup?: string, groupSize?: string): Promise<string> {
  // Remove data URL prefix if present
  const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
  const buffer = Buffer.from(base64String, 'base64');
  
  // Create structured filename and folder structure
  let filename: string;
  let subDir = '';
  
  if (customerId && workDate) {
    const date = new Date(workDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`; // YYYYMMDD
    const timestamp = Date.now();
    
    // Create year/month subdirectory
    subDir = `${year}/${month}`;
    const fullSubDir = path.join(uploadsDir, subDir);
    if (!fs.existsSync(fullSubDir)) {
      fs.mkdirSync(fullSubDir, { recursive: true });
    }
    
    // Create descriptive filename with group info
    const groupInfo = isGroup === 'true' ? `_GROUP${groupSize || ''}` : '_INDIVIDUAL';
    filename = `${customerId}${groupInfo}_${dateStr}_${type}_${timestamp}.jpg`;
  } else {
    // Fallback to UUID if customerId/workDate not available
    filename = `${type}_${uuidv4()}.jpg`;
  }
  
  const relativePath = subDir ? path.join(subDir, filename) : filename;
  const filepath = path.join(uploadsDir, relativePath);
  
  // Optimize and save image using sharp
  await sharp(buffer)
    .jpeg({ quality: 80 })
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .toFile(filepath);
  
  return relativePath; // Return relative path from uploads folder
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from uploads directory
  app.use('/uploads', (req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    next();
  });
  app.use('/uploads', express.static(uploadsDir));

  // Image upload endpoint
  app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { type } = req.body; // 'work' or 'customer'
      if (!type || !['work', 'customer'].includes(type)) {
        return res.status(400).json({ message: 'Invalid image type' });
      }

      const filename = `${type}_${uuidv4()}.jpg`;
      const filepath = path.join(uploadsDir, filename);

      // Optimize and save image
      await sharp(req.file.buffer)
        .jpeg({ quality: 80 })
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .toFile(filepath);

      res.json({ filename, url: `/uploads/${filename}` });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Failed to upload image' });
    }
  });

  // Get all customers
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  // Get customers with pagination and filtering
  app.get("/api/customers/paginated", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filter = {
        dateRange: req.query.dateRange as 'today' | 'week' | 'month' | 'all' | undefined,
        status: req.query.status as string,
        programType: req.query.programType as string,
        search: req.query.search as string
      };

      // Remove undefined values
      Object.keys(filter).forEach(key => {
        if (!filter[key as keyof typeof filter]) {
          delete filter[key as keyof typeof filter];
        }
      });

      const result = await storage.getCustomersPaginated(page, limit, filter);
      res.json(result);
    } catch (error) {
      console.error("Error fetching paginated customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  // Get today's customers for registration view
  app.get("/api/customers/today", async (_req, res) => {
    try {
      const customers = await storage.getTodayCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching today's customers:", error);
      res.status(500).json({ message: "Failed to fetch today's customers" });
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
      const data = req.body;
      
      // Store original base64 images temporarily
      const originalWorkImage = data.workImage;
      const originalCustomerImage = data.customerImage;
      
      // Remove base64 images for initial customer creation
      if (data.workImage && data.workImage.startsWith('data:image/')) {
        data.workImage = null;
      }
      if (data.customerImage && data.customerImage.startsWith('data:image/')) {
        data.customerImage = null;
      }
      
      const validatedData = insertCustomerSchema.parse(data);
      const customer = await storage.createCustomer(validatedData);
      
      // Now process images with proper customer info
      let updatedCustomer = customer;
      if (originalWorkImage && originalWorkImage.startsWith('data:image/')) {
        const workImageFilename = await saveBase64Image(
          originalWorkImage, 
          'work', 
          customer.customerId, 
          customer.workDate.toISOString(),
          customer.isGroup,
          customer.groupSize
        );
        updatedCustomer = await storage.updateCustomer(customer.id, { workImage: workImageFilename }) || customer;
      }
      
      if (originalCustomerImage && originalCustomerImage.startsWith('data:image/')) {
        const customerImageFilename = await saveBase64Image(
          originalCustomerImage, 
          'customer', 
          customer.customerId, 
          customer.workDate.toISOString(),
          customer.isGroup,
          customer.groupSize
        );
        updatedCustomer = await storage.updateCustomer(updatedCustomer.id, { customerImage: customerImageFilename }) || updatedCustomer;
      }
      
      res.status(201).json(updatedCustomer);
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

      // Get existing customer info for proper file naming
      const existingCustomer = await storage.getCustomer(id);
      if (!existingCustomer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const data = req.body;
      
      // Only process images if they are new base64 strings (not existing filenames)
      if (data.workImage && data.workImage.startsWith('data:image/')) {
        // Delete old work image file if exists
        if (existingCustomer.workImage) {
          try {
            const oldImagePath = path.join(uploadsDir, existingCustomer.workImage);
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
            }
          } catch (fileError) {
            console.error("Error deleting old work image:", fileError);
          }
        }
        
        // Save new work image
        data.workImage = await saveBase64Image(
          data.workImage, 
          'work', 
          existingCustomer.customerId, 
          (data.workDate || existingCustomer.workDate).toString(),
          data.isGroup || existingCustomer.isGroup,
          data.groupSize || existingCustomer.groupSize
        );
      } else if (data.workImage === undefined || data.workImage === null || data.workImage === '') {
        // If workImage is being cleared, keep the existing value
        data.workImage = existingCustomer.workImage;
      }
      
      if (data.customerImage && data.customerImage.startsWith('data:image/')) {
        // Delete old customer image file if exists
        if (existingCustomer.customerImage) {
          try {
            const oldImagePath = path.join(uploadsDir, existingCustomer.customerImage);
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
            }
          } catch (fileError) {
            console.error("Error deleting old customer image:", fileError);
          }
        }
        
        // Save new customer image
        data.customerImage = await saveBase64Image(
          data.customerImage, 
          'customer', 
          existingCustomer.customerId, 
          (data.workDate || existingCustomer.workDate).toString(),
          data.isGroup || existingCustomer.isGroup,
          data.groupSize || existingCustomer.groupSize
        );
      } else if (data.customerImage === undefined || data.customerImage === null || data.customerImage === '') {
        // If customerImage is being cleared, keep the existing value
        data.customerImage = existingCustomer.customerImage;
      }

      const validatedData = insertCustomerSchema.partial().parse(data);
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

  // Delete customer
  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid customer ID" });
      }

      // Get customer info before deletion to clean up files
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Delete customer from storage
      const success = await storage.deleteCustomer(id);
      if (!success) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Clean up image files
      try {
        if (customer.workImage) {
          const workImagePath = path.join(uploadsDir, customer.workImage);
          if (fs.existsSync(workImagePath)) {
            fs.unlinkSync(workImagePath);
          }
        }
        if (customer.customerImage) {
          const customerImagePath = path.join(uploadsDir, customer.customerImage);
          if (fs.existsSync(customerImagePath)) {
            fs.unlinkSync(customerImagePath);
          }
        }
      } catch (fileError) {
        console.error("Error deleting files:", fileError);
        // Continue even if file deletion fails
      }

      res.json({ message: "Customer deleted successfully" });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Check image files status
  app.get("/api/check-images", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      const imageFiles = new Set<string>();
      const missingFiles: string[] = [];
      
      // Collect all image filenames from database
      customers.forEach(customer => {
        if (customer.workImage) imageFiles.add(customer.workImage);
        if (customer.customerImage) imageFiles.add(customer.customerImage);
      });
      
      // Check if files exist in uploads folder
      Array.from(imageFiles).forEach(filename => {
        const filepath = path.join(uploadsDir, filename);
        if (!fs.existsSync(filepath)) {
          missingFiles.push(filename);
        }
      });
      
      // Get actual files in uploads folder
      const actualFiles = fs.readdirSync(uploadsDir).filter(file => 
        file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.webp')
      );
      
      res.json({
        databaseImages: Array.from(imageFiles),
        actualFiles,
        missingFiles,
        totalInDatabase: imageFiles.size,
        totalInFolder: actualFiles.length
      });
    } catch (error) {
      console.error("Error checking images:", error);
      res.status(500).json({ message: "Failed to check images" });
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

  // Download images by date range
  app.get("/api/images/download", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      // Get all customers within date range
      const customers = await storage.getCustomers();
      const filteredCustomers = customers.filter(customer => {
        const workDate = new Date(customer.workDate);
        return workDate >= start && workDate <= end;
      });

      // Create zip file with images
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="images_${startDate}_to_${endDate}.zip"`);
      
      archive.pipe(res);
      
      // Add images to zip
      for (const customer of filteredCustomers) {
        const groupInfo = customer.isGroup === 'true' ? `_GROUP${customer.groupSize || ''}` : '_INDIVIDUAL';
        const customerDir = `${customer.customerId}${groupInfo}`;
        
        if (customer.workImage) {
          const workImagePath = path.join(uploadsDir, customer.workImage);
          if (fs.existsSync(workImagePath)) {
            archive.file(workImagePath, { name: `${customerDir}/${customer.customerId}_work.jpg` });
          }
        }
        
        if (customer.customerImage) {
          const customerImagePath = path.join(uploadsDir, customer.customerImage);
          if (fs.existsSync(customerImagePath)) {
            archive.file(customerImagePath, { name: `${customerDir}/${customer.customerId}_customer.jpg` });
          }
        }
      }
      
      archive.finalize();
    } catch (error) {
      console.error("Error downloading images:", error);
      res.status(500).json({ message: "Failed to download images" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

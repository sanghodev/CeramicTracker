import { Request, Response } from 'express';
import { storage } from './storage';

export async function healthCheck(req: Request, res: Response) {
  const startTime = Date.now();
  
  try {
    console.log('Health check: Testing database connection...');
    
    // Test database connectivity
    const customers = await storage.getCustomers();
    const responseTime = Date.now() - startTime;
    
    const healthData = {
      status: 'healthy',
      database: 'connected',
      customerCount: customers.length,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    };
    
    console.log('Health check passed:', healthData);
    res.json(healthData);
    
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    const errorData = {
      status: 'unhealthy',
      database: 'disconnected',
      error: error?.message || String(error),
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };
    
    console.error('Health check failed:', errorData);
    res.status(500).json(errorData);
  }
}

export async function detailedHealth(req: Request, res: Response) {
  try {
    // Database connection test
    const dbStart = Date.now();
    const customers = await storage.getCustomers();
    const dbTime = Date.now() - dbStart;
    
    // Memory usage
    const memUsage = process.memoryUsage();
    
    const detailedData = {
      status: 'healthy',
      database: {
        status: 'connected',
        customerCount: customers.length,
        responseTime: `${dbTime}ms`
      },
      server: {
        uptime: `${Math.floor(process.uptime())}s`,
        memory: {
          used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
        },
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(detailedData);
    
  } catch (error: any) {
    res.status(500).json({
      status: 'unhealthy',
      error: error?.message || String(error),
      timestamp: new Date().toISOString()
    });
  }
}
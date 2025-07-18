# Customer Management System

## Overview

This is a full-stack customer management application built for a ceramics studio. The system handles customer registration, artwork tracking, and management through a mobile-first interface. It features image capture capabilities, customer data management, and an image-based search system for artwork identification.

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for the UI layer
- **Vite** as the build tool and development server
- **Tailwind CSS** with shadcn/ui components for styling
- **Wouter** for client-side routing
- **React Query (TanStack Query)** for server state management
- **React Hook Form** with Zod validation for form handling

### Backend Architecture
- **Express.js** server with TypeScript
- **RESTful API** design for client-server communication
- **Drizzle ORM** for database operations
- **Neon PostgreSQL** as the database provider
- **Multer** for file upload handling
- **Sharp** for image processing

### Database Schema
The system uses MySQL with the following main entities:
- **Customers**: Core customer information, work details, and tracking status
- **Users**: Basic authentication system (currently minimal)

Key customer fields include:
- Unique customer ID generation (YYMMDD-ProgramType-Number format)
- Support for individual and group bookings
- Multiple program types (painting, ceramics)
- Image storage for both customer info and artwork
- Status tracking (waiting, in_progress, completed)
- Contact and pickup status management

## Key Components

### Customer Registration
- Mobile-optimized camera capture interface
- OCR capabilities for automatic data extraction (placeholder implementation)
- Manual form entry with validation
- Support for both individual and group bookings
- Image capture for customer information and artwork

### Customer Management
- Comprehensive customer listing with search functionality
- Status management (waiting, in progress, completed)
- Contact status tracking
- Storage location and pickup status management
- Profile summary generation with AI integration potential

### Image Search System
- Camera-based image capture for artwork identification
- Basic image matching system (similarity-based placeholder)
- Historical customer data search within configurable timeframes

### File Management
- Structured file organization by date and customer
- Base64 and file upload support
- Image processing and optimization with Sharp
- Secure file serving through Express static middleware

## Data Flow

1. **Customer Registration Flow:**
   - User captures image via mobile camera
   - OCR processing extracts customer data (placeholder)
   - Form validation and submission
   - Database storage with unique ID generation
   - File organization and storage

2. **Customer Management Flow:**
   - Query customer data with React Query
   - Real-time updates via optimistic updates
   - Status modifications through PATCH endpoints
   - Image display with zoom capabilities

3. **Image Search Flow:**
   - Camera capture or file upload
   - Image comparison against stored customer images
   - Similarity scoring and match ranking
   - Results display with customer context

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/**: Accessible UI component primitives
- **sharp**: Image processing and optimization
- **multer**: File upload middleware

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety across the stack
- **Tailwind CSS**: Utility-first styling
- **React Hook Form**: Form management with validation

### Potential Integrations
- **@anthropic-ai/sdk**: AI integration for customer profiling and OCR
- Image processing services for enhanced search capabilities
- Cloud storage solutions for scalable file management

## Deployment Strategy

### Development Setup
- Node.js environment with ESM modules
- Vite development server with HMR
- Environment variables for database configuration
- File system-based image storage in `uploads/` directory

### Production Considerations
- Express server serves both API and static assets
- Database migrations managed through Drizzle Kit
- File uploads handled locally (consideration for cloud storage needed)
- Environment-based configuration for database connections

### Build Process
1. Vite builds the React frontend to `dist/public`
2. ESBuild bundles the Express server to `dist/index.js`
3. Drizzle manages database schema migrations
4. Static assets served from Express in production

## Changelog
- June 29, 2025. Initial setup
- June 29, 2025. Enhanced image recognition and matching system:
  - Improved phone number recognition (Korean 010-XXXX-XXXX, US, international formats)
  - Advanced image matching with edge detection, texture analysis, and shape recognition
  - Optimized matching thresholds and accuracy display (75%+ Excellent, 60%+ Good, 45%+ Fair)
  - Integrated Google Vision API for text recognition
- January 6, 2025. Enhanced email recognition system:
  - 5-stage email detection system for multi-line, obscured, and OCR-corrupted emails
  - Advanced fuzzy matching for severely corrupted text
  - OCR error correction (at→@, dot→., character confusion handling)
- January 6, 2025. Database migration to MySQL:
  - Migrated from PostgreSQL to MySQL for GoDaddy hosting compatibility
  - Updated schema using drizzle-orm/mysql-core
  - Implemented fallback to memory storage when MySQL connection fails
  - Modified insert/update operations for MySQL compatibility (no returning() clause)
- January 7, 2025. MySQL connection successful:
  - Successfully connected to GoDaddy MySQL database (ellysarts_db)
  - Created MySQL tables with proper snake_case column naming
  - All CRUD operations working in MySQL: create, read, update, delete
  - Customer editing and deletion features fully functional
- January 7, 2025. Enhanced image storage and download system:
  - Improved image file naming with group information: CustomerID_GROUP4_DATE_type_timestamp.jpg
  - Organized files in year/month folder structure (uploads/2025/01/)
  - Added image download API with date range filtering and ZIP compression
  - Created image download UI component in Customer Management page
  - Fixed "save failed" error caused by MySQL schema inconsistency

## User Preferences

Preferred communication style: Simple, everyday language.
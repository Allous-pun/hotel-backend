// src/app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

// Route imports
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/users.routes");
const roomRoutes = require("./routes/rooms.routes");
const bookingRoutes = require("./routes/bookings.routes");
const foodRoutes = require("./routes/food.routes");
const eventRoutes = require("./routes/events.routes");
const tableRoutes = require("./routes/table.routes");
const settingRoutes = require("./routes/setting.routes");

// Middleware imports
const errorHandler = require("./middleware/errorHandler");

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize app
const app = express();

// CORS Configuration - Fixed
const allowedOrigins = [
  'http://localhost:5173',    // Vite dev server
  'http://localhost:5174',    // Alternate Vite port
  'http://localhost:3000',    // Create React App
  'http://localhost:5000',    // Backend itself (for testing)
  'https://hotel-backend-vdra.onrender.com', // Your backend domain
  process.env.FRONTEND_URL,   // From environment variable
].filter(Boolean); // Remove any undefined values

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // For development, you can be more permissive
      if (process.env.NODE_ENV === 'development') {
        console.log(`Allowing origin in development: ${origin}`);
        callback(null, true);
      } else {
        console.log(`Blocked by CORS: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

// Global Middleware
app.use(cors(corsOptions));

// Add explicit CORS headers for preflight requests
app.use((req, res, next) => {
  // Get the origin from the request
  const origin = req.headers.origin;
  
  // Check if origin is in allowed list
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers - Updated CSP to allow more flexibility
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https:"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https:"],
    imgSrc: ["'self'", "data:", "https:", "http:"],
    connectSrc: ["'self'", "https:", "http:", "ws:", "wss:"],
    fontSrc: ["'self'", "https:", "data:"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'self'"]
  }
}));

// Rate limiting
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for development
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and certain paths
    return req.path === '/health' || req.path === '/';
  }
});

// Apply rate limiting to all API routes
app.use("/api/", limiter);

// Base route - Health check
app.get("/", (req, res) => {
  res.json({
    message: "🏨 Roomie Explorer Hotel Backend API",
    status: "running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    cors: {
      allowedOrigins: allowedOrigins,
      frontendUrl: process.env.FRONTEND_URL
    },
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      rooms: "/api/rooms",
      bookings: "/api/bookings",
      foods: "/api/foods",
      events: "/api/events",
      tables: "/api/tables",
      settings: "/api/settings"
    }
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  });
});

// CORS test endpoint
app.get("/cors-test", (req, res) => {
  res.json({
    message: "CORS test successful",
    origin: req.headers.origin,
    allowedOrigins: allowedOrigins,
    timestamp: new Date().toISOString()
  });
});

// API Documentation endpoint
app.get("/api/docs", (req, res) => {
  res.json({
    documentation: "API Documentation",
    baseUrl: process.env.BASE_URL || "http://localhost:5000",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
    cors: {
      allowedOrigins: allowedOrigins,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    },
    authentication: "All protected routes require JWT token in Authorization header",
    endpoints: {
      auth: {
        login: "POST /api/auth/login",
        register: "POST /api/auth/register",
        logout: "POST /api/auth/logout",
        refresh: "POST /api/auth/refresh-token"
      },
      users: {
        getAll: "GET /api/users",
        getProfile: "GET /api/users/profile",
        updateProfile: "PUT /api/users/profile",
        updateUser: "PUT /api/users/:id (admin only)",
        deleteUser: "DELETE /api/users/:id (admin only)"
      },
      foods: {
        getFoods: "GET /api/foods",
        getCategories: "GET /api/foods/categories",
        createOrder: "POST /api/foods/order",
        guestOrder: "POST /api/foods/order/guest",
        myOrders: "GET /api/foods/orders/my",
        trackOrder: "GET /api/foods/orders/track/:orderCode"
      },
      tables: {
        getTables: "GET /api/tables",
        getAvailable: "GET /api/tables/available",
        createTable: "POST /api/tables (admin only)",
        occupyTable: "POST /api/tables/:id/occupy",
        clearTable: "POST /api/tables/:id/clear"
      }
    }
  });
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/settings", settingRoutes);

// 404 Handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    error: "Not Found",
    timestamp: new Date().toISOString()
  });
});

// Error Handler - Must be last middleware
app.use(errorHandler);

module.exports = app;
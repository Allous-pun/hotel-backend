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

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  optionsSuccessStatus: 200
};

// Global Middleware
app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"]
  }
}));

// Rate limiting
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
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
    uptime: process.uptime()
  });
});

// API Documentation endpoint
app.get("/api/docs", (req, res) => {
  res.json({
    documentation: "API Documentation",
    baseUrl: process.env.BASE_URL || "http://localhost:5000",
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
app.use("/api/tables", tableRoutes); // NEW: Table routes
app.use("/api/settings", settingRoutes);

// 404 Handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    error: "Not Found"
  });
});

// Error Handler - Must be last middleware
app.use(errorHandler);

module.exports = app;
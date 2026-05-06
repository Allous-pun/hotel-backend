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

// Error handler
const errorHandler = require("./middleware/errorHandler");

// Load env variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize app
const app = express();

// ======================
// CORS CONFIGURATION
// ======================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://ziongardenresort.com',
  'https://www.ziongardenresort.com',
  'https://hotel-backend-vdra.onrender.com',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);

      console.error("❌ Blocked by CORS:", origin);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ======================
// BASIC MIDDLEWARE
// ======================
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================
// SECURITY HEADERS
// ======================
app.use(
  helmet.contentSecurityPolicy({
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
  })
);

// ======================
// RATE LIMITING
// ======================
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/health" || req.path === "/",
});

app.use("/api/", limiter);

// ======================
// BASE ROUTE
// ======================
app.get("/", (req, res) => {
  res.json({
    message: "🏨 Roomie Explorer Hotel Backend API - CLEAN DEPLOY",
    status: "running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ======================
// HEALTH CHECK
// ======================
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  });
});

// ======================
// CORS TEST
// ======================
app.get("/cors-test", (req, res) => {
  res.json({
    message: "CORS test successful",
    origin: req.headers.origin,
    allowedOrigins,
    timestamp: new Date().toISOString()
  });
});

// ======================
// ROUTES
// ======================
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/settings", settingRoutes);

// ======================
// 404 HANDLER
// ======================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    error: "Not Found",
    timestamp: new Date().toISOString()
  });
});

// ======================
// ERROR HANDLER
// ======================
app.use(errorHandler);

module.exports = app;

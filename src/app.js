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

// Middleware imports
const errorHandler = require("./middleware/errorHandler");

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize app
const app = express();

// Global Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

// Base route
app.get("/", (req, res) => {
  res.send("🏨 Roomie Explorer Hotel Backend Running...");
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/food", foodRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/settings", require("./routes/setting.routes"));

// Error Handler
app.use(errorHandler);

module.exports = app;

// src/app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

// Load env FIRST (safe)
dotenv.config();

// Route imports
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/users.routes");
const roomRoutes = require("./routes/rooms.routes");
const bookingRoutes = require("./routes/bookings.routes");
const foodRoutes = require("./routes/food.routes");
const eventRoutes = require("./routes/events.routes");

// Middleware
const errorHandler = require("./middleware/errorHandler");

// Initialize app
const app = express();

// ==========================
// GLOBAL MIDDLEWARE
// ==========================
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

// ==========================
// DB CONNECTION (SAFE GUARD)
// ==========================
const connectDB = require("./config/db");

if (process.env.MONGO_URI) {
  connectDB();
} else {
  console.warn("⚠️ MONGO_URI not found - skipping DB connection");
}

// ==========================
// BASE ROUTES
// ==========================
app.get("/", (req, res) => {
  res.send("🏨 Roomie Explorer Hotel Backend Running...");
});

// HEALTH CHECK (IMPORTANT FOR RENDER)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
  });
});

// ==========================
// 🔁 TEMP MIGRATION ROUTE
// ==========================
app.get("/migrate", async (req, res) => {
  try {
    if (req.query.key !== process.env.MIGRATION_KEY) {
      return res.status(403).send("Unauthorized");
    }

    const OLD_URI = process.env.OLD_MONGO_URI;
    const NEW_URI = process.env.NEW_MONGO_URI;

    if (!OLD_URI || !NEW_URI) {
      return res.status(500).send("Missing DB URIs");
    }

    const oldConn = await mongoose.createConnection(OLD_URI);
    const newConn = await mongoose.createConnection(NEW_URI);

    const collections = ["rooms"];

    for (const name of collections) {
      const oldCol = oldConn.collection(name);
      const newCol = newConn.collection(name);

      const data = await oldCol.find().toArray();

      console.log(`📦 ${name}: ${data.length} records`);

      await newCol.deleteMany({});

      if (data.length > 0) {
        await newCol.insertMany(data);
      }

      console.log(`✅ Migrated ${name}`);
    }

    await oldConn.close();
    await newConn.close();

    res.send("🎉 Migration complete");
  } catch (err) {
    console.error("❌ Migration error:", err);
    res.status(500).send("Migration failed");
  }
});

// ==========================
// ROUTES
// ==========================
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/settings", require("./routes/setting.routes"));

// ==========================
// ERROR HANDLER
// ==========================
app.use(errorHandler);

module.exports = app;

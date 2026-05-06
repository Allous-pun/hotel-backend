// src/app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
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

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error('❌ Blocked by CORS:', origin);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

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
  skip: (req) => req.path === '/health' || req.path === '/',
});

app.use("/api/", limiter);

// ======================
// BASE ROUTE (DEPLOY CHECK)
// ======================
app.get("/", (req, res) => {
  res.json({
    message: "🏨 Roomie Explorer Hotel Backend API - DEPLOYED SUCCESSFULLY",
    deployId: Date.now(),
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
// 🔁 MIGRATION ROUTE (FULLY WORKING VERSION)
// ======================
app.get("/migrate", async (req, res) => {
  console.log("🚀 Migration route hit");

  // Use a try-catch to handle any connection or migration errors
  try {
    // 1. Authentication Check
    if (req.query.key !== process.env.MIGRATION_KEY) {
      console.log("❌ Unauthorized migration attempt");
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const OLD_URI = process.env.OLD_MONGO_URI;
    const NEW_URI = process.env.NEW_MONGO_URI;

    if (!OLD_URI || !NEW_URI) {
      console.log("❌ Missing DB URIs in environment variables");
      return res.status(500).json({ success: false, message: "Missing DB URIs in environment variables" });
    }

    // 2. Establish Connections with Timeouts
    console.log("🔗 Connecting to OLD database...");
    const oldConnection = await mongoose.createConnection(OLD_URI, {
      serverSelectionTimeoutMS: 15000, // 15 seconds timeout
      connectTimeoutMS: 15000,
    });

    console.log("🔗 Connecting to NEW database...");
    const newConnection = await mongoose.createConnection(NEW_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });

    console.log("✅ Successfully connected to both databases.");

    // 3. Define Collections to Migrate
    const collectionsToMigrate = [
      "rooms",
      "bookings",
      "users",
      "foods",
      "events",
      "tables",
      "settings"
    ];

    const migrationResults = {};

    // 4. Iterate and Migrate Each Collection
    for (const collectionName of collectionsToMigrate) {
      console.log(`\n📦 Starting migration for collection: ${collectionName}`);
      try {
        // Get the Mongoose model for the collection (or create a temporary one)
        // This is a more reliable way than accessing the native driver directly.
        let OldModel, NewModel;
        
        // Define a schema-less model to access the collection data
        const tempSchema = new mongoose.Schema({}, { strict: false, versionKey: false });
        
        // We need to check if the model is already registered to prevent OverwriteModelError
        if (mongoose.models[`Old_${collectionName}`]) {
          OldModel = mongoose.models[`Old_${collectionName}`];
        } else {
          OldModel = oldConnection.model(`Old_${collectionName}`, tempSchema, collectionName);
        }
        
        if (mongoose.models[`New_${collectionName}`]) {
          NewModel = mongoose.models[`New_${collectionName}`];
        } else {
          NewModel = newConnection.model(`New_${collectionName}`, tempSchema, collectionName);
        }

        // Fetch all documents from the old collection
        const documents = await OldModel.find({}).lean().exec();
        console.log(`   📄 Found ${documents.length} documents in '${collectionName}'.`);

        if (documents.length === 0) {
          console.log(`   ⏭️ Skipping '${collectionName}' as it has no documents.`);
          migrationResults[collectionName] = { migrated: 0, skipped: true, reason: "No documents found" };
          continue;
        }

        // Clear the new collection before inserting (optional, but ensures a clean slate)
        await NewModel.deleteMany({}).exec();
        
        // Insert the documents into the new collection in batches to avoid memory issues
        const batchSize = 100;
        let insertedCount = 0;
        for (let i = 0; i < documents.length; i += batchSize) {
          const batch = documents.slice(i, i + batchSize);
          await NewModel.insertMany(batch, { ordered: false });
          insertedCount += batch.length;
          console.log(`   ✅ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)} (${insertedCount}/${documents.length})`);
        }

        console.log(`   ✅ Successfully migrated ${insertedCount} documents to '${collectionName}'.`);
        migrationResults[collectionName] = { migrated: insertedCount, skipped: false };

      } catch (collectionError) {
        console.error(`   ❌ Failed to migrate collection '${collectionName}':`, collectionError.message);
        migrationResults[collectionName] = { error: collectionError.message, migrated: 0, skipped: false };
        // Decide if you want to stop the entire migration on one failure
        // For now, we log the error but continue with other collections.
      }
    }

    // 5. Close Connections
    await oldConnection.close();
    await newConnection.close();
    console.log("\n🔌 Database connections closed.");

    // 6. Send Final Response
    console.log("🎉 Migration process finished.");
    return res.status(200).json({
      success: true,
      message: "Migration process completed.",
      results: migrationResults,
    });

  } catch (error) {
    console.error("❌ CRITICAL MIGRATION FAILURE:", error);
    return res.status(500).json({
      success: false,
      message: "Migration failed due to a critical error.",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
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

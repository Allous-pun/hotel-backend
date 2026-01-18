// scripts/seedSettings.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { Setting } = require("../models/Setting");

dotenv.config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // Check if exists
    const existing = await Setting.findOne();
    if (existing) {
      console.log("Settings already exist.");
      process.exit(0);
    }

    // Create default settings
    const defaultSettings = {
      restaurantInfo: {
        name: "Zion Gardens Resort",
        phone: "+254700000000",
        email: "info@roomiehotel.com",
        address: "Nairobi, Kenya",
        description: "Welcome to Roomie Explorer Hotel",
        logo: ""
      }
    };

    const settings = await Setting.create(defaultSettings);
    console.log("✅ Settings created:", settings);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();

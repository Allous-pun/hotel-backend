const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    // 🏨 Hotel / Restaurant Information
    restaurantInfo: {
      name: { type: String, required: true },
      phone: { type: String },
      email: { type: String },
      address: { type: String },
      description: { type: String },
      logo: { type: String },
    },

    // 📖 About Us Section
    aboutUs: {
      enabled: { type: Boolean, default: true },
      title: { type: String, default: "About Our Restaurant" },
      content: { type: String, default: "" },
      images: [{ type: String }], // Array of image URLs
      features: [{
        title: { type: String },
        description: { type: String },
        icon: { type: String } // Icon name or URL
      }],
      team: [{
        name: { type: String },
        position: { type: String },
        bio: { type: String },
        image: { type: String }
      }]
    },

    // 📞 Contact Information & Page Settings
    contact: {
      enabled: { type: Boolean, default: true },
      pageTitle: { type: String, default: "Contact Us" },
      // Multiple contact methods
      contactMethods: {
        phone: {
          enabled: { type: Boolean, default: true },
          numbers: [{ type: String }] // Multiple phone numbers
        },
        email: {
          enabled: { type: Boolean, default: true },
          addresses: [{ type: String }] // Multiple email addresses
        },
        whatsapp: {
          enabled: { type: Boolean, default: false },
          number: { type: String }
        },
        socialMedia: {
          facebook: { type: String },
          instagram: { type: String },
          twitter: { type: String },
          linkedin: { type: String }
        }
      },
      // Location information
      locations: [{
        name: { type: String },
        address: { type: String },
        phone: { type: String },
        email: { type: String },
        coordinates: {
          lat: { type: Number },
          lng: { type: Number }
        },
        isPrimary: { type: Boolean, default: false }
      }],
      // Contact form settings
      contactForm: {
        enabled: { type: Boolean, default: true },
        requiredFields: {
          name: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
          phone: { type: Boolean, default: false },
          subject: { type: Boolean, default: true },
          message: { type: Boolean, default: true }
        },
        autoResponder: {
          enabled: { type: Boolean, default: true },
          subject: { type: String, default: "Thank you for contacting us" },
          message: { type: String, default: "We have received your message and will get back to you soon." }
        }
      }
    },

    // 🕒 Operating Hours for Each Service
    operatingHours: {
      restaurantService: {
        open: { type: String, default: "08:00" },
        close: { type: String, default: "22:00" },
      },
      roomService: {
        open: { type: String, default: "00:00" },
        close: { type: String, default: "23:59" },
      },
      eventBookings: {
        open: { type: String, default: "09:00" },
        close: { type: String, default: "18:00" },
      },
      customerSupport: {
        open: { type: String, default: "09:00" },
        close: { type: String, default: "17:00" },
        timezone: { type: String, default: "UTC" }
      },
    },

    // 🔔 Notification Settings (In-App Dashboard)
    notifications: {
      enabled: { type: Boolean, default: true }, // master toggle
      preferences: {
        newBookings: { type: Boolean, default: true },
        foodOrders: { type: Boolean, default: true },
        eventInquiries: { type: Boolean, default: true },
        paymentConfirmations: { type: Boolean, default: true },
        dailyReports: { type: Boolean, default: true },
        contactFormSubmissions: { type: Boolean, default: true }, // New
      },
      // internal dashboard only (no external push yet)
      deliveryMethod: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: false }, // reserved for future
        sms: { type: Boolean, default: false }, // reserved for future
      },
    },

    // 🔐 Security & Access Controls
    security: {
      twoFactorAuth: { type: Boolean, default: false },
      passwordPolicy: {
        minLength: { type: Number, default: 8 },
        requireNumber: { type: Boolean, default: true },
        requireUppercase: { type: Boolean, default: false },
        requireSpecialChar: { type: Boolean, default: false },
      },
    },

    // ⚙️ System Preferences
    system: {
      maintenanceMode: { type: Boolean, default: false },
      allowSelfRegistration: { type: Boolean, default: true },
      bookingAutoConfirm: { type: Boolean, default: false },
      // New settings for public pages
      publicPages: {
        aboutUs: { type: Boolean, default: true },
        contact: { type: Boolean, default: true }
      }
    },

    // 📋 Audit Trail
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Contact Form Submissions Schema
const contactSubmissionSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true 
    },
    email: { 
      type: String, 
      required: true,
      trim: true,
      lowercase: true 
    },
    phone: { 
      type: String,
      trim: true 
    },
    subject: { 
      type: String, 
      required: true,
      trim: true 
    },
    message: { 
      type: String, 
      required: true,
      trim: true 
    },
    // Additional fields for better management
    ipAddress: { type: String },
    userAgent: { type: String },
    referrer: { type: String }, // Where the user came from
    // Status tracking
    status: {
      type: String,
      enum: ["new", "read", "replied", "closed"],
      default: "new"
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium"
    },
    // Response tracking
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    response: {
      message: { type: String },
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      respondedAt: { type: Date }
    },
    // Tags for categorization
    tags: [{ type: String }],
    
    // Internal notes
    internalNotes: [{
      note: { type: String },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      createdAt: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

// Index for better query performance
contactSubmissionSchema.index({ status: 1, createdAt: -1 });
contactSubmissionSchema.index({ email: 1 });
contactSubmissionSchema.index({ assignedTo: 1 });

const Setting = mongoose.model("Setting", settingSchema);
const ContactSubmission = mongoose.model("ContactSubmission", contactSubmissionSchema);

module.exports = { Setting, ContactSubmission };
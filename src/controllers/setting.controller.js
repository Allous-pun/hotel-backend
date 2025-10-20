const { Setting, ContactSubmission } = require("../models/Setting");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const mongoose = require("mongoose");

// 🟩 Get all settings
exports.getSettings = async (req, res) => {
  try {
    const settings = await Setting.findOne();
    if (!settings) return res.status(404).json({ message: "Settings not found" });

    res.status(200).json(settings);
  } catch (err) {
    console.error("❌ Error fetching settings:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🟩 Create or update all settings (Admin)
exports.updateSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    const updatedData = { ...req.body, lastUpdatedBy: req.user?._id };

    if (!settings) {
      settings = await Setting.create(updatedData);
    } else {
      Object.assign(settings, updatedData);
      await settings.save();
    }

    res.status(200).json({
      message: "Settings updated successfully",
      settings,
    });
  } catch (err) {
    console.error("❌ Error updating settings:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🟦 Update Restaurant Info
exports.updateRestaurantInfo = async (req, res) => {
  try {
    const settings = await Setting.findOne();
    if (!settings) return res.status(404).json({ message: "Settings not found" });

    settings.restaurantInfo = { ...settings.restaurantInfo, ...req.body };
    settings.lastUpdatedBy = req.user._id;
    await settings.save();

    res.status(200).json({
      message: "Restaurant information updated successfully",
      restaurantInfo: settings.restaurantInfo,
    });
  } catch (err) {
    console.error("❌ Error updating restaurant info:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🟧 Update Operating Hours - FIXED VERSION
exports.updateOperatingHours = async (req, res) => {
  try {
    const settings = await Setting.findOne();
    if (!settings) return res.status(404).json({ message: "Settings not found" });

    // Safely merge each service individually to avoid undefined values
    if (req.body.restaurantService) {
      settings.operatingHours.restaurantService = {
        ...settings.operatingHours.restaurantService,
        ...req.body.restaurantService
      };
    }
    
    if (req.body.roomService) {
      settings.operatingHours.roomService = {
        ...settings.operatingHours.roomService,
        ...req.body.roomService
      };
    }
    
    if (req.body.eventBookings) {
      settings.operatingHours.eventBookings = {
        ...settings.operatingHours.eventBookings,
        ...req.body.eventBookings
      };
    }
    
    if (req.body.customerSupport) {
      settings.operatingHours.customerSupport = {
        ...settings.operatingHours.customerSupport,
        ...req.body.customerSupport
      };
    }

    settings.lastUpdatedBy = req.user._id;
    await settings.save();

    res.status(200).json({
      message: "Operating hours updated successfully",
      operatingHours: settings.operatingHours,
    });
  } catch (err) {
    console.error("❌ Error updating operating hours:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🟨 Update Notification Preferences
exports.updateNotifications = async (req, res) => {
  try {
    const settings = await Setting.findOne();
    if (!settings) return res.status(404).json({ message: "Settings not found" });

    // Merge both preferences and deliveryMethod
    if (req.body.preferences)
      settings.notifications.preferences = {
        ...settings.notifications.preferences,
        ...req.body.preferences,
      };
    if (req.body.deliveryMethod)
      settings.notifications.deliveryMethod = {
        ...settings.notifications.deliveryMethod,
        ...req.body.deliveryMethod,
      };

    settings.notifications.enabled =
      req.body.enabled ?? settings.notifications.enabled;

    settings.lastUpdatedBy = req.user._id;
    await settings.save();

    res.status(200).json({
      message: "Notification settings updated successfully",
      notifications: settings.notifications,
    });
  } catch (err) {
    console.error("❌ Error updating notifications:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🟥 Update Security Settings (2FA or password policy)
exports.updateSecurity = async (req, res) => {
  try {
    const settings = await Setting.findOne();
    if (!settings) return res.status(404).json({ message: "Settings not found" });

    // ✅ Safely merge nested structure
    if (req.body.twoFactorAuth !== undefined)
      settings.security.twoFactorAuth = req.body.twoFactorAuth;

    if (req.body.passwordPolicy) {
      settings.security.passwordPolicy = {
        ...settings.security.passwordPolicy,
        ...req.body.passwordPolicy,
      };
    }

    settings.lastUpdatedBy = req.user._id;
    await settings.save();

    res.status(200).json({
      message: "Security settings updated successfully",
      security: settings.security,
    });
  } catch (err) {
    console.error("❌ Error updating security settings:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🟪 Update System Preferences (maintenance mode, etc.)
exports.updateSystemPreferences = async (req, res) => {
  try {
    const settings = await Setting.findOne();
    if (!settings) return res.status(404).json({ message: "Settings not found" });

    settings.system = { ...settings.system, ...req.body };
    settings.lastUpdatedBy = req.user._id;
    await settings.save();

    res.status(200).json({
      message: "System preferences updated successfully",
      system: settings.system,
    });
  } catch (err) {
    console.error("❌ Error updating system preferences:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔐 Change Admin Password (with validation)
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect current password" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("❌ Error updating password:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🆕 Get Restaurant Basic Info (Public)
exports.getRestaurantBasicInfo = async (req, res) => {
  try {
    const settings = await Setting.findOne().select('restaurantInfo operatingHours');
    if (!settings) return res.status(404).json({ message: "Settings not found" });

    // Return only basic restaurant info that's safe for public
    const basicInfo = {
      name: settings.restaurantInfo.name,
      logo: settings.restaurantInfo.logo,
      description: settings.restaurantInfo.description,
      phone: settings.restaurantInfo.phone,
      email: settings.restaurantInfo.email,
      address: settings.restaurantInfo.address,
      operatingHours: {
        restaurantService: settings.operatingHours.restaurantService,
        customerSupport: settings.operatingHours.customerSupport
      }
    };

    res.status(200).json(basicInfo);
  } catch (err) {
    console.error("❌ Error fetching restaurant basic info:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🆕 ABOUT US CONTROLLERS

// Get About Us settings (Public)
exports.getAboutUs = async (req, res) => {
  try {
    const settings = await Setting.findOne().select('aboutUs restaurantInfo');
    if (!settings) return res.status(404).json({ message: "Settings not found" });

    res.status(200).json({
      aboutUs: settings.aboutUs,
      restaurantInfo: settings.restaurantInfo
    });
  } catch (err) {
    console.error("❌ Error fetching about us:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update About Us (Admin)
exports.updateAboutUs = async (req, res) => {
  try {
    const settings = await Setting.findOne();
    if (!settings) return res.status(404).json({ message: "Settings not found" });

    settings.aboutUs = { ...settings.aboutUs, ...req.body };
    settings.lastUpdatedBy = req.user._id;
    await settings.save();

    res.status(200).json({
      message: "About us updated successfully",
      aboutUs: settings.aboutUs,
    });
  } catch (err) {
    console.error("❌ Error updating about us:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🆕 CONTACT CONTROLLERS

// Get Contact settings (Public)
exports.getContactInfo = async (req, res) => {
  try {
    const settings = await Setting.findOne().select('contact restaurantInfo operatingHours');
    if (!settings) return res.status(404).json({ message: "Settings not found" });

    res.status(200).json({
      contact: settings.contact,
      restaurantInfo: settings.restaurantInfo,
      operatingHours: settings.operatingHours
    });
  } catch (err) {
    console.error("❌ Error fetching contact info:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update Contact settings (Admin) - FIXED
exports.updateContactInfo = async (req, res) => {
  try {
    const settings = await Setting.findOne();
    if (!settings) return res.status(404).json({ message: "Settings not found" });

    // Safely merge each nested object individually
    if (req.body.enabled !== undefined) {
      settings.contact.enabled = req.body.enabled;
    }
    
    if (req.body.pageTitle !== undefined) {
      settings.contact.pageTitle = req.body.pageTitle;
    }

    // Safely merge contactMethods
    if (req.body.contactMethods) {
      if (req.body.contactMethods.phone) {
        settings.contact.contactMethods.phone = {
          ...settings.contact.contactMethods.phone,
          ...req.body.contactMethods.phone
        };
      }
      
      if (req.body.contactMethods.email) {
        settings.contact.contactMethods.email = {
          ...settings.contact.contactMethods.email,
          ...req.body.contactMethods.email
        };
      }
      
      if (req.body.contactMethods.whatsapp) {
        settings.contact.contactMethods.whatsapp = {
          ...settings.contact.contactMethods.whatsapp,
          ...req.body.contactMethods.whatsapp
        };
      }
      
      if (req.body.contactMethods.socialMedia) {
        settings.contact.contactMethods.socialMedia = {
          ...settings.contact.contactMethods.socialMedia,
          ...req.body.contactMethods.socialMedia
        };
      }
    }

    // Safely merge locations array
    if (req.body.locations !== undefined) {
      settings.contact.locations = req.body.locations;
    }

    // Safely merge contactForm
    if (req.body.contactForm) {
      if (req.body.contactForm.enabled !== undefined) {
        settings.contact.contactForm.enabled = req.body.contactForm.enabled;
      }
      
      if (req.body.contactForm.requiredFields) {
        settings.contact.contactForm.requiredFields = {
          ...settings.contact.contactForm.requiredFields,
          ...req.body.contactForm.requiredFields
        };
      }
      
      if (req.body.contactForm.autoResponder) {
        settings.contact.contactForm.autoResponder = {
          ...settings.contact.contactForm.autoResponder,
          ...req.body.contactForm.autoResponder
        };
      }
    }

    settings.lastUpdatedBy = req.user._id;
    await settings.save();

    res.status(200).json({
      message: "Contact information updated successfully",
      contact: settings.contact,
    });
  } catch (err) {
    console.error("❌ Error updating contact info:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🆕 CONTACT FORM SUBMISSIONS CONTROLLERS

// Submit contact form (Public)
exports.submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    
    // Basic validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "Required fields: name, email, subject, message" });
    }

    const submission = await ContactSubmission.create({
      name,
      email,
      phone,
      subject,
      message,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      referrer: req.get('Referer')
    });

    res.status(201).json({
      message: "Thank you for your message. We'll get back to you soon!",
      submissionId: submission._id
    });
  } catch (err) {
    console.error("❌ Error submitting contact form:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all contact submissions (Admin/Staff)
exports.getContactSubmissions = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const submissions = await ContactSubmission.find(query)
      .populate('assignedTo', 'name email')
      .populate('response.respondedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ContactSubmission.countDocuments(query);

    res.status(200).json({
      submissions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    console.error("❌ Error fetching contact submissions:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get single contact submission (Admin/Staff)
exports.getContactSubmission = async (req, res) => {
  try {
    const submission = await ContactSubmission.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('response.respondedBy', 'name email')
      .populate('internalNotes.createdBy', 'name email');

    if (!submission) {
      return res.status(404).json({ message: "Contact submission not found" });
    }

    res.status(200).json(submission);
  } catch (err) {
    console.error("❌ Error fetching contact submission:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update contact submission status/assignment (Admin/Staff) - FIXED
exports.updateContactSubmission = async (req, res) => {
  try {
    const { status, priority, assignedTo, tags } = req.body;
    
    const submission = await ContactSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: "Contact submission not found" });
    }

    // Validate assignedTo is a valid ObjectId if provided
    if (assignedTo && !mongoose.Types.ObjectId.isValid(assignedTo)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    // Update fields if provided
    if (status) submission.status = status;
    if (priority) submission.priority = priority;
    if (assignedTo) submission.assignedTo = assignedTo;
    if (tags) submission.tags = tags;

    await submission.save();

    const updatedSubmission = await ContactSubmission.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('response.respondedBy', 'name email');

    res.status(200).json({
      message: "Contact submission updated successfully",
      submission: updatedSubmission
    });
  } catch (err) {
    console.error("❌ Error updating contact submission:", err);
    res.status(500).json({ message: "Server error" });
  }
};
// Add response to contact submission (Admin/Staff)
exports.addResponseToSubmission = async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: "Response message is required" });
    }

    const submission = await ContactSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: "Contact submission not found" });
    }

    submission.response = {
      message,
      respondedBy: req.user._id,
      respondedAt: new Date()
    };
    submission.status = 'replied';

    await submission.save();

    const populatedSubmission = await ContactSubmission.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('response.respondedBy', 'name email');

    res.status(200).json({
      message: "Response added successfully",
      submission: populatedSubmission
    });
  } catch (err) {
    console.error("❌ Error adding response:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Add internal note to contact submission (Admin/Staff)
exports.addInternalNote = async (req, res) => {
  try {
    const { note } = req.body;
    
    if (!note) {
      return res.status(400).json({ message: "Note content is required" });
    }

    const submission = await ContactSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: "Contact submission not found" });
    }

    submission.internalNotes.push({
      note,
      createdBy: req.user._id
    });

    await submission.save();

    const populatedSubmission = await ContactSubmission.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('internalNotes.createdBy', 'name email');

    res.status(200).json({
      message: "Internal note added successfully",
      submission: populatedSubmission
    });
  } catch (err) {
    console.error("❌ Error adding internal note:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete contact submission (Admin)
exports.deleteContactSubmission = async (req, res) => {
  try {
    const submission = await ContactSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: "Contact submission not found" });
    }

    await ContactSubmission.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Contact submission deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting contact submission:", err);
    res.status(500).json({ message: "Server error" });
  }
};
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function validateProfileUpdate({ name, email, role }) {
  if (!name || !email || !role) {
    return {
      valid: false,
      message: "Please fill in all fields.",
    };
  }

  return {
    valid: true,
    message: "",
  };
}

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Please fill in all fields.",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
    });

    await user.save();

    res.status(201).json({
      message: "Account created successfully.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error.",
    });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please enter email and password.",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(400).json({
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error.",
    });
  }
});

// UPDATE PROFILE
router.put("/update-profile", requireAuth, async (req, res) => {
  try {
    const { name, email } = req.body;
    const validationResult = validateProfileUpdate({
      name,
      email,
      role: req.user.role,
    });

    if (!validationResult.valid) {
      return res.status(400).json({
        message: validationResult.message,
      });
    }

    const sanitizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: sanitizedEmail });

    if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
      return res.status(400).json({
        message: "An account with this email already exists.",
      });
    }

    const user = req.user;

    user.name = name.trim();
    user.email = sanitizedEmail;

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error.",
    });
  }
});

router.validateProfileUpdate = validateProfileUpdate;

module.exports = router;
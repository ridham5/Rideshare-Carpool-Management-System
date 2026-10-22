const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Please log in to continue." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId);

    if (!user) {
      return res.status(401).json({ message: "User account was not found." });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Your session has expired. Please log in again." });
    }

    return res.status(500).json({ message: "Server error." });
  }
}

function requireDriver(req, res, next) {
  if (req.user.role !== "Driver") {
    return res.status(403).json({ message: "Only drivers can post rides." });
  }

  return next();
}

function requireRider(req, res, next) {
  if (req.user.role !== "Rider") {
    return res.status(403).json({ message: "Only riders can search for rides." });
  }

  return next();
}

module.exports = { requireAuth, requireDriver, requireRider };

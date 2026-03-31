const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/User");

const auth = (...allowedRoles) => async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing bearer token" });
    }

    const token = header.replace("Bearer ", "").trim();
    const payload = jwt.verify(token, env.jwtSecret);

    const user = await User.findById(payload.sub).select("_id name email role");
    if (!user) {
      return res.status(401).json({ message: "Invalid token user" });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      console.error(`[Auth] Forbidden! User role: "${user.role}" not in allowed:`, allowedRoles);
      return res.status(403).json({ message: "Forbidden for this role" });
    }

    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

module.exports = auth;

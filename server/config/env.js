const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, ".env") });

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/ai_digital_classroom",
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://localhost:8000",
  fileStorageMode: process.env.FILE_STORAGE_MODE || "local",
  localUploadDir: process.env.LOCAL_UPLOAD_DIR || "uploads"
};

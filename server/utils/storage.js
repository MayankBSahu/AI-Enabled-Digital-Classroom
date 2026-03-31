const env = require("../config/env");

const resolveFileUrl = (filename) => {
  if (env.fileStorageMode === "local") {
    return `/uploads/${filename}`;
  }

  return filename;
};

module.exports = { resolveFileUrl };

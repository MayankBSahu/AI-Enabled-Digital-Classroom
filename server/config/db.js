const mongoose = require("mongoose");
const env = require("./env");

const connectDb = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    // eslint-disable-next-line no-console
    console.log(`[db] connected to ${env.mongoUri}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[db] connection error", error.message);
    process.exit(1);
  }
};

module.exports = { connectDb };

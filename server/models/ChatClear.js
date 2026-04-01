const mongoose = require("mongoose");

const chatClearSchema = new mongoose.Schema(
  {
    courseId: { type: String, required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    clearedAt: { type: Date, default: Date.now }
  }
);

chatClearSchema.index({ courseId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("ChatClear", chatClearSchema);

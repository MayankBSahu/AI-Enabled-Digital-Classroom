const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    courseId: { type: String, required: true, index: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", announcementSchema);

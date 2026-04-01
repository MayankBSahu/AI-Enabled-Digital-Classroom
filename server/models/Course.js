const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    enrollmentCode: { type: String, required: true, unique: true }, // e.g. "XY78ZP"
    courseId: { type: String, required: true }, // visually seen by users e.g. "CS201"
    name: { type: String, required: true }, // e.g. "Data Structures"
    description: { type: String, default: "" },
    icon: { type: String, default: "📚" },
    color: { type: String, default: "#6366f1" },
    professor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);

const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    courseId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    rubric: { type: [String], default: [] },
    maxMarks: { type: Number, required: true, min: 1 },
    dueDate: { type: Date, required: true },
    isProject: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Assignment", assignmentSchema);

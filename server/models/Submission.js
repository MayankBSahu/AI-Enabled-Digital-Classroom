const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fileUrl: { type: String, required: true },
    status: { type: String, enum: ["submitted", "evaluating", "evaluated", "error"], default: "submitted" },
    aiResult: {
      marks: { type: Number, default: null },
      feedback: { type: String, default: "" },
      mistakes: { type: [String], default: [] },
      suggestions: { type: [String], default: [] },
      confidence: { type: Number, default: null }
    }
  },
  { timestamps: true }
);

submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("Submission", submissionSchema);

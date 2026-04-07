const mongoose = require("mongoose");

const doubtSchema = new mongoose.Schema(
  {
    courseId: { type: String, required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sessionId: { type: String, index: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    citations: {
      type: [
        {
          materialId: { type: String, default: "" },
          chunkId: { type: String, default: "" },
          score: { type: Number, default: null }
        }
      ],
      default: []
    },
    qualityScore: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Doubt", doubtSchema);

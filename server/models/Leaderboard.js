const mongoose = require("mongoose");

const leaderboardSchema = new mongoose.Schema(
  {
    courseId: { type: String, required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignmentScoreNorm: { type: Number, default: 0 },
    projectScoreNorm: { type: Number, default: 0 },
    doubtScoreNorm: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
    snapshotDate: { type: Date, default: () => new Date() }
  },
  { timestamps: true }
);

leaderboardSchema.index({ courseId: 1, snapshotDate: -1, rank: 1 });

module.exports = mongoose.model("Leaderboard", leaderboardSchema);

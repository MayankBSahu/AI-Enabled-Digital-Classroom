const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema(
  {
    courseId: { type: String, required: true, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["slide", "note", "assignment", "project-topic"], required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    vectorized: { type: Boolean, default: false },
    indexedChunks: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Material", materialSchema);

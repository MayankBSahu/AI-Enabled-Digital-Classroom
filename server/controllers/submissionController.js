const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const { resolveFileUrl } = require("../utils/storage");
const { evaluateAssignment } = require("../utils/aiClient");

const uploadSubmission = async (req, res) => {
  const { assignmentId } = req.params;
  const { submissionText = "" } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: "submission file is required" });
  }

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    return res.status(404).json({ message: "Assignment not found" });
  }

  const fileUrl = resolveFileUrl(req.file.filename);

  let finalSubmissionText = submissionText;
  if (!finalSubmissionText && req.file && req.file.mimetype === "application/pdf") {
    try {
      const dataBuffer = fs.readFileSync(req.file.path);
      const data = await pdfParse(dataBuffer);
      finalSubmissionText = data.text;
    } catch (e) {
      console.error("Failed to parse PDF document:", e);
    }
  }

  const submission = await Submission.findOneAndUpdate(
    { assignmentId, studentId: req.user._id },
    {
      assignmentId,
      studentId: req.user._id,
      fileUrl,
      status: "evaluating",
      aiResult: {
        marks: null,
        feedback: "",
        mistakes: [],
        suggestions: [],
        confidence: null
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  try {
    const aiResult = await evaluateAssignment({
      submission_id: submission._id.toString(),
      file_url: fileUrl,
      submission_text: finalSubmissionText,
      description: assignment.description || "",
      rubric: assignment.rubric,
      max_marks: assignment.maxMarks,
      model_answer: ""
    });

    submission.status = "evaluated";
    submission.aiResult = {
      marks: aiResult.marks ?? 0,
      feedback: aiResult.feedback || "No feedback generated",
      mistakes: aiResult.mistakes || [],
      suggestions: aiResult.suggestions || [],
      confidence: aiResult.confidence ?? 0
    };

    await submission.save();
  } catch (error) {
    submission.status = "error";
    await submission.save();
    return res.status(502).json({
      message: "Submission received, but AI evaluation failed",
      submission,
      aiError: error.message
    });
  }

  return res.status(201).json({ submission });
};

const listSubmissionsByAssignment = async (req, res) => {
  const { assignmentId } = req.params;
  const submissions = await Submission.find({ assignmentId })
    .populate("studentId", "name email")
    .sort({ createdAt: -1 });
  return res.json({ submissions });
};

const getMySubmissions = async (req, res) => {
  try {
    const { courseId } = req.params;
    const assignments = await Assignment.find({ courseId }).lean();
    const assignmentIds = assignments.map(a => a._id);
    const submissions = await Submission.find({
      assignmentId: { $in: assignmentIds },
      studentId: req.user._id
    })
      .populate("assignmentId", "title maxMarks dueDate")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ submissions });
  } catch (error) {
    console.error("Get my submissions error:", error.message);
    return res.status(500).json({ message: "Failed to load submissions" });
  }
};

module.exports = {
  uploadSubmission,
  listSubmissionsByAssignment,
  getMySubmissions
};

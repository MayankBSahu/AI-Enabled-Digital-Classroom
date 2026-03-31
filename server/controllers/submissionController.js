const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
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
      submission_text: submissionText,
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

module.exports = {
  uploadSubmission,
  listSubmissionsByAssignment
};

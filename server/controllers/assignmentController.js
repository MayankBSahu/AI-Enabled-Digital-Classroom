const Assignment = require("../models/Assignment");

const createAssignment = async (req, res) => {
  const { courseId, title, description, rubric, maxMarks, dueDate } = req.body;

  if (!courseId || !title || !maxMarks || !dueDate) {
    return res.status(400).json({ message: "courseId, title, maxMarks and dueDate are required" });
  }

  const assignment = await Assignment.create({
    courseId,
    title,
    description: description || "",
    rubric: Array.isArray(rubric) ? rubric : [],
    maxMarks,
    dueDate,
    createdBy: req.user._id
  });

  return res.status(201).json({ assignment });
};

const listAssignmentsByCourse = async (req, res) => {
  const { courseId } = req.params;
  const assignments = await Assignment.find({ courseId }).sort({ dueDate: 1 });
  return res.json({ assignments });
};

module.exports = {
  createAssignment,
  listAssignmentsByCourse
};

const Assignment = require("../models/Assignment");
const Announcement = require("../models/Announcement");
const Submission = require("../models/Submission");

const createAssignment = async (req, res) => {
  const { courseId, title, description, rubric, maxMarks, dueDate, isProject } = req.body;

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
    isProject: !!isProject,
    createdBy: req.user._id
  });

  try {
    const itemTypeStr = isProject ? "Project" : "Assignment";
    await Announcement.create({
      courseId,
      postedBy: req.user._id,
      title: `New ${itemTypeStr}: ${title}`,
      message: `A new ${itemTypeStr.toLowerCase()} has been posted.\n\nDescription: ${description || "No description provided."}\nMax Marks: ${maxMarks}\nDue Date: ${new Date(dueDate).toLocaleString()}`,
      type: itemTypeStr.toLowerCase(),
      referenceId: assignment._id.toString()
    });
  } catch (error) {
    console.error("Failed to automatically post announcement for assignment:", error);
  }

  return res.status(201).json({ assignment });
};

const listAssignmentsByCourse = async (req, res) => {
  const { courseId } = req.params;
  const assignments = await Assignment.find({ courseId }).sort({ createdAt: -1 });
  return res.json({ assignments });
};

const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, rubric, maxMarks, dueDate, isProject } = req.body;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    if (title !== undefined) assignment.title = title;
    if (description !== undefined) assignment.description = description;
    if (rubric !== undefined) assignment.rubric = Array.isArray(rubric) ? rubric : [];
    if (maxMarks !== undefined) assignment.maxMarks = maxMarks;
    if (dueDate !== undefined) assignment.dueDate = dueDate;
    if (isProject !== undefined) assignment.isProject = !!isProject;
    await assignment.save();

    return res.json({ assignment });
  } catch (error) {
    console.error("Update assignment error:", error.message);
    return res.status(500).json({ message: "Failed to update assignment" });
  }
};

const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findByIdAndDelete(id);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }
    // Delete associated submissions
    await Submission.deleteMany({ assignmentId: id });
    return res.json({ message: "Assignment deleted" });
  } catch (error) {
    console.error("Delete assignment error:", error.message);
    return res.status(500).json({ message: "Failed to delete assignment" });
  }
};

module.exports = {
  createAssignment,
  listAssignmentsByCourse,
  updateAssignment,
  deleteAssignment
};

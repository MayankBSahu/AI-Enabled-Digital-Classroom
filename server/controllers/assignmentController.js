const Assignment = require("../models/Assignment");
const Announcement = require("../models/Announcement");

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
  const assignments = await Assignment.find({ courseId }).sort({ dueDate: 1 });
  return res.json({ assignments });
};

module.exports = {
  createAssignment,
  listAssignmentsByCourse
};

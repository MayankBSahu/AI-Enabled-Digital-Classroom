const Announcement = require("../models/Announcement");
const Comment = require("../models/Comment");

const createAnnouncement = async (req, res) => {
  const { courseId, title, message } = req.body;
  if (!courseId || !title || !message) {
    return res.status(400).json({ message: "courseId, title and message are required" });
  }

  const announcement = await Announcement.create({
    courseId,
    title,
    message,
    postedBy: req.user._id
  });

  return res.status(201).json({ announcement });
};

const listAnnouncements = async (req, res) => {
  const { courseId } = req.params;
  const announcements = await Announcement.find({ courseId })
    .populate("postedBy", "name email")
    .sort({ createdAt: -1 });

  return res.json({ announcements });
};

const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message } = req.body;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    if (title) announcement.title = title;
    if (message) announcement.message = message;
    await announcement.save();

    return res.json({ announcement });
  } catch (error) {
    console.error("Update announcement error:", error.message);
    return res.status(500).json({ message: "Failed to update announcement" });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findByIdAndDelete(id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    // Also delete associated comments
    await Comment.deleteMany({ announcementId: id });
    return res.json({ message: "Announcement deleted" });
  } catch (error) {
    console.error("Delete announcement error:", error.message);
    return res.status(500).json({ message: "Failed to delete announcement" });
  }
};

// ── Comment Endpoints ──

const addComment = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const comment = await Comment.create({
      announcementId,
      userId: req.user._id,
      text: text.trim()
    });

    const populated = await Comment.findById(comment._id).populate("userId", "name email role");
    return res.status(201).json({ comment: populated });
  } catch (error) {
    console.error("Add comment error:", error.message);
    return res.status(500).json({ message: "Failed to add comment" });
  }
};

const listComments = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const comments = await Comment.find({ announcementId })
      .populate("userId", "name email role")
      .sort({ createdAt: 1 });
    return res.json({ comments });
  } catch (error) {
    console.error("List comments error:", error.message);
    return res.status(500).json({ message: "Failed to load comments" });
  }
};

module.exports = {
  createAnnouncement,
  listAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  addComment,
  listComments
};

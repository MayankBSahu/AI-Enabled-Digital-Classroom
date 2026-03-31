const Announcement = require("../models/Announcement");

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

module.exports = {
  createAnnouncement,
  listAnnouncements
};

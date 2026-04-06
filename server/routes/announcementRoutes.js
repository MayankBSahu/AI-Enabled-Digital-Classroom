const express = require("express");
const auth = require("../middleware/auth");
const { createAnnouncement, listAnnouncements, updateAnnouncement, deleteAnnouncement, addComment, listComments } = require("../controllers/announcementController");

const router = express.Router();

router.post("/", auth("professor", "admin"), createAnnouncement);
router.get("/course/:courseId", auth("student", "professor", "admin"), listAnnouncements);
router.put("/:id", auth("professor", "admin"), updateAnnouncement);
router.delete("/:id", auth("professor", "admin"), deleteAnnouncement);

// Comments
router.post("/:announcementId/comments", auth("student", "professor", "admin"), addComment);
router.get("/:announcementId/comments", auth("student", "professor", "admin"), listComments);

module.exports = router;

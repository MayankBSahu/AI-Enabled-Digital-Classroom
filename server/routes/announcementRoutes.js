const express = require("express");
const auth = require("../middleware/auth");
const { createAnnouncement, listAnnouncements } = require("../controllers/announcementController");

const router = express.Router();

router.post("/", auth("professor", "admin"), createAnnouncement);
router.get("/course/:courseId", auth("student", "professor", "admin"), listAnnouncements);

module.exports = router;

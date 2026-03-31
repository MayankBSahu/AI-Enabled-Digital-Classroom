const express = require("express");
const auth = require("../middleware/auth");
const { getCourseAnalytics } = require("../controllers/analyticsController");

const router = express.Router();

router.get("/:courseId", auth("professor", "admin"), getCourseAnalytics);

module.exports = router;

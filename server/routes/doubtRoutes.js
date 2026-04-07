const express = require("express");
const auth = require("../middleware/auth");
const { askCourseDoubt, getCourseDoubts, clearCourseDoubts } = require("../controllers/doubtController");

const router = express.Router();

router.post("/ask", auth("student", "professor"), askCourseDoubt);
router.get("/course/:courseId", auth("student", "professor"), getCourseDoubts);
router.delete("/course/:courseId", auth("student", "professor"), clearCourseDoubts);

module.exports = router;

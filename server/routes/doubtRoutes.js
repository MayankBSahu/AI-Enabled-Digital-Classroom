const express = require("express");
const auth = require("../middleware/auth");
const { askCourseDoubt, getCourseDoubts } = require("../controllers/doubtController");

const router = express.Router();

router.post("/ask", auth("student"), askCourseDoubt);
router.get("/course/:courseId", auth("student"), getCourseDoubts);

module.exports = router;

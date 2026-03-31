const express = require("express");
const auth = require("../middleware/auth");
const { createAssignment, listAssignmentsByCourse } = require("../controllers/assignmentController");

const router = express.Router();

router.post("/", auth("professor", "admin"), createAssignment);
router.get("/course/:courseId", auth("student", "professor", "admin"), listAssignmentsByCourse);

module.exports = router;

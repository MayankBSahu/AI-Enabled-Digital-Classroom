const express = require("express");
const auth = require("../middleware/auth");
const { createAssignment, listAssignmentsByCourse, updateAssignment, deleteAssignment } = require("../controllers/assignmentController");

const router = express.Router();

router.post("/", auth("professor", "admin"), createAssignment);
router.get("/course/:courseId", auth("student", "professor", "admin"), listAssignmentsByCourse);
router.put("/:id", auth("professor", "admin"), updateAssignment);
router.delete("/:id", auth("professor", "admin"), deleteAssignment);

module.exports = router;

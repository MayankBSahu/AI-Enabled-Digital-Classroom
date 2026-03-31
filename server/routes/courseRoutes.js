const express = require("express");
const auth = require("../middleware/auth");
const {
  createCourse,
  enrollStudent,
  getEnrolledCourses,
  getProfessorCourses,
  getCourseStudents
} = require("../controllers/courseController");

const router = express.Router();

router.post("/", auth("professor"), createCourse);
router.get("/professor", auth("professor"), getProfessorCourses);

router.post("/enroll", auth("student"), enrollStudent);
router.get("/student", auth("student"), getEnrolledCourses);

router.get("/:id/students", auth("professor", "student", "admin"), getCourseStudents);

module.exports = router;

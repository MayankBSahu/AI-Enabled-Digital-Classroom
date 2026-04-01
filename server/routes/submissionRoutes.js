const express = require("express");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  uploadSubmission,
  listSubmissionsByAssignment,
  getMySubmissions
} = require("../controllers/submissionController");

const router = express.Router();

router.post("/:assignmentId/upload", auth("student"), upload.single("file"), uploadSubmission);
router.get("/:assignmentId", auth("professor", "admin"), listSubmissionsByAssignment);
router.get("/my/:courseId", auth("student"), getMySubmissions);

module.exports = router;

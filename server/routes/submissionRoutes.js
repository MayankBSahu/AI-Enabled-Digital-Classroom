const express = require("express");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  uploadSubmission,
  listSubmissionsByAssignment,
  getMySubmissions,
  updateSubmissionScore
} = require("../controllers/submissionController");

const router = express.Router();

router.post("/:assignmentId/upload", auth("student"), upload.single("file"), uploadSubmission);
router.get("/:assignmentId", auth("professor", "admin"), listSubmissionsByAssignment);
router.put("/:id/score", auth("professor", "admin"), updateSubmissionScore);
router.get("/my/:courseId", auth("student"), getMySubmissions);

module.exports = router;

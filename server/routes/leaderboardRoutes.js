const express = require("express");
const auth = require("../middleware/auth");
const {
  recomputeLeaderboard,
  getLatestLeaderboard
} = require("../controllers/leaderboardController");

const router = express.Router();

router.post("/:courseId/recompute", auth("professor", "admin"), recomputeLeaderboard);
router.get("/:courseId", auth("student", "professor", "admin"), getLatestLeaderboard);

module.exports = router;

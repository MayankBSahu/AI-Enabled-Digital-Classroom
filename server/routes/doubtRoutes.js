const express = require("express");
const auth = require("../middleware/auth");
const { askCourseDoubt } = require("../controllers/doubtController");

const router = express.Router();

router.post("/ask", auth("student"), askCourseDoubt);

module.exports = router;

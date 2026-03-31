const express = require("express");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const { uploadMaterial, listMaterialsByCourse } = require("../controllers/materialController");

const router = express.Router();

router.post("/", auth("professor", "admin"), upload.single("file"), uploadMaterial);
router.get("/course/:courseId", auth("student", "professor", "admin"), listMaterialsByCourse);

module.exports = router;

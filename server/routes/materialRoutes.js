const express = require("express");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const { uploadMaterial, listMaterialsByCourse, reindexCourseMaterials, updateMaterial, deleteMaterial } = require("../controllers/materialController");

const router = express.Router();

router.post("/", auth("professor", "admin"), upload.single("file"), uploadMaterial);
router.get("/course/:courseId", auth("student", "professor", "admin"), listMaterialsByCourse);
router.post("/reindex/:courseId", auth("professor", "admin"), reindexCourseMaterials);
router.put("/:id", auth("professor", "admin"), updateMaterial);
router.delete("/:id", auth("professor", "admin"), deleteMaterial);

module.exports = router;

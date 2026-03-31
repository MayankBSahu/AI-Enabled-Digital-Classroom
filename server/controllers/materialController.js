const Material = require("../models/Material");
const { resolveFileUrl } = require("../utils/storage");
const { ingestMaterial } = require("../utils/aiClient");

const uploadMaterial = async (req, res) => {
  const { courseId, type, title, description = "", materialText = "" } = req.body;

  if (!courseId || !type || !title) {
    return res.status(400).json({ message: "courseId, type, and title are required" });
  }

  const fileUrl = req.file ? resolveFileUrl(req.file.filename) : "";

  const material = await Material.create({
    courseId,
    uploadedBy: req.user._id,
    type,
    title,
    description,
    fileUrl
  });

  try {
    const textForIndex = materialText || `${title}\n${description}`;
    if (textForIndex.trim()) {
      const indexed = await ingestMaterial({
        course_id: courseId,
        material_id: material._id.toString(),
        title,
        text: textForIndex
      });

      material.vectorized = true;
      material.indexedChunks = indexed.indexed_chunks || 0;
      await material.save();
    }
  } catch (error) {
    return res.status(502).json({
      message: "Material uploaded, but vector indexing failed",
      material,
      aiError: error.message
    });
  }

  return res.status(201).json({ material });
};

const listMaterialsByCourse = async (req, res) => {
  const { courseId } = req.params;
  const materials = await Material.find({ courseId }).sort({ createdAt: -1 });
  return res.json({ materials });
};

module.exports = {
  uploadMaterial,
  listMaterialsByCourse
};

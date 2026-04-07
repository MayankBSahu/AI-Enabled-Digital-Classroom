const fs = require("fs");
const path = require("path");
const Material = require("../models/Material");
const { resolveFileUrl } = require("../utils/storage");
const { ingestMaterial } = require("../utils/aiClient");
const env = require("../config/env");

/**
 * Extract text from an uploaded PDF file using pdf-parse.
 * Returns empty string on any error (non-PDF, corrupt, etc).
 */
const extractPdfText = async (filePath) => {
  try {
    const pdfParse = require("pdf-parse");
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch (error) {
    console.log("PDF extraction skipped/failed:", error.message);
    return "";
  }
};

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
    // Build a header so every chunk knows which material it belongs to
    const materialHeader = `[Material: "${title}" | Type: ${type}${description ? ` | Description: ${description}` : ""}]\n\n`;

    // Start with manually provided text
    let textForIndex = materialText || "";

    // If a PDF was uploaded, extract its text and append
    if (req.file && req.file.mimetype === "application/pdf") {
      const uploadDir = path.resolve(process.cwd(), env.localUploadDir);
      const filePath = path.join(uploadDir, req.file.filename);
      const pdfText = await extractPdfText(filePath);
      if (pdfText.trim()) {
        textForIndex = textForIndex
          ? `${textForIndex}\n\n${pdfText}`
          : pdfText;
      }
    }

    // Fallback to title + description if still empty
    if (!textForIndex.trim()) {
      textForIndex = `${title}\n${description}`;
    }

    // Prepend the header so every chunk carries the material identity
    textForIndex = materialHeader + textForIndex;

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

const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type } = req.body;
    const material = await Material.findById(id);
    if (!material) return res.status(404).json({ message: "Material not found" });

    if (title !== undefined) material.title = title;
    if (description !== undefined) material.description = description;
    if (type !== undefined) material.type = type;
    await material.save();
    return res.json({ material });
  } catch (error) {
    console.error("Update material error:", error.message);
    return res.status(500).json({ message: "Failed to update material" });
  }
};

const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const material = await Material.findByIdAndDelete(id);
    if (!material) return res.status(404).json({ message: "Material not found" });

    // Try to delete the physical file
    if (material.fileUrl) {
      const filename = material.fileUrl.replace(/^\/uploads\//, "");
      const uploadDir = path.resolve(process.cwd(), env.localUploadDir);
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    return res.json({ message: "Material deleted" });
  } catch (error) {
    console.error("Delete material error:", error.message);
    return res.status(500).json({ message: "Failed to delete material" });
  }
};

/**
 * Re-index ALL materials for a course.
 * Extracts PDF text from existing files and re-indexes everything with proper headers.
 */
const reindexCourseMaterials = async (req, res) => {
  const { courseId } = req.params;
  const materials = await Material.find({ courseId });

  if (!materials.length) {
    return res.json({ message: "No materials to re-index", reindexed: 0 });
  }

  const uploadDir = path.resolve(process.cwd(), env.localUploadDir);
  let reindexed = 0;
  const errors = [];

  for (const mat of materials) {
    try {
      const materialHeader = `[Material: "${mat.title}" | Type: ${mat.type}${mat.description ? ` | Description: ${mat.description}` : ""}]\n\n`;

      let textForIndex = "";

      // Try to extract PDF text if file exists
      if (mat.fileUrl) {
        const filename = mat.fileUrl.replace(/^\/uploads\//, "");
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) {
          const pdfText = await extractPdfText(filePath);
          if (pdfText.trim()) {
            textForIndex = pdfText;
          }
        }
      }

      // Fallback
      if (!textForIndex.trim()) {
        textForIndex = `${mat.title}\n${mat.description || ""}`;
      }

      textForIndex = materialHeader + textForIndex;

      const indexed = await ingestMaterial({
        course_id: courseId,
        material_id: mat._id.toString(),
        title: mat.title,
        text: textForIndex
      });

      mat.vectorized = true;
      mat.indexedChunks = indexed.indexed_chunks || 0;
      await mat.save();
      reindexed++;
    } catch (error) {
      errors.push({ title: mat.title, error: error.message });
    }
  }

  return res.json({ message: `Re-indexed ${reindexed}/${materials.length} materials`, reindexed, errors });
};

module.exports = {
  uploadMaterial,
  listMaterialsByCourse,
  reindexCourseMaterials,
  updateMaterial,
  deleteMaterial
};

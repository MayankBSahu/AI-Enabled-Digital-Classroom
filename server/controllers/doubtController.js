const Doubt = require("../models/Doubt");
const { askDoubt, scoreDoubtQuality } = require("../utils/aiClient");

const askCourseDoubt = async (req, res) => {
  const { courseId, question } = req.body;

  if (!courseId || !question) {
    return res.status(400).json({ message: "courseId and question are required" });
  }

  const ragResponse = await askDoubt({
    course_id: courseId,
    student_id: req.user._id.toString(),
    question
  });

  const quality = await scoreDoubtQuality({
    question,
    answer: ragResponse.answer || "",
    citations_count: Array.isArray(ragResponse.citations) ? ragResponse.citations.length : 0
  });

  const doubt = await Doubt.create({
    courseId,
    studentId: req.user._id,
    question,
    answer: ragResponse.answer,
    citations: (ragResponse.citations || []).map((c) => ({
      materialId: c.material_id || "",
      chunkId: c.chunk_id || "",
      score: c.score ?? null
    })),
    qualityScore: quality.quality_score ?? 0
  });

  return res.status(201).json({ doubt });
};

module.exports = { askCourseDoubt };

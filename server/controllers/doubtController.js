const Doubt = require("../models/Doubt");
const ChatClear = require("../models/ChatClear");
const { askDoubt, scoreDoubtQuality } = require("../utils/aiClient");

const askCourseDoubt = async (req, res) => {
  const { courseId, question } = req.body;

  if (!courseId || !question) {
    return res.status(400).json({ message: "courseId and question are required" });
  }

  try {
    // Fetch last 5 exchanges for conversation context
    const recentDoubts = await Doubt.find({
      courseId,
      studentId: req.user._id
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const history = recentDoubts.reverse().map((d) => ({
      question: d.question,
      answer: d.answer
    }));

    const ragResponse = await askDoubt({
      course_id: courseId,
      student_id: req.user._id.toString(),
      question,
      history
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
  } catch (error) {
    console.error("Ask doubt error:", error?.response?.data || error.message);
    return res.status(500).json({ message: "Failed to process doubt", error: error.message });
  }
};

const getCourseDoubts = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check if student has cleared their chat — only show doubts after that
    const clearRecord = await ChatClear.findOne({ courseId, studentId: req.user._id }).lean();
    const filter = {
      courseId,
      studentId: req.user._id
    };
    if (clearRecord?.clearedAt) {
      filter.createdAt = { $gt: clearRecord.clearedAt };
    }

    const doubts = await Doubt.find(filter)
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({ doubts });
  } catch (error) {
    console.error("Get doubts error:", error.message);
    return res.status(500).json({ message: "Failed to load doubts", error: error.message });
  }
};

const clearCourseDoubts = async (req, res) => {
  try {
    const { courseId } = req.params;
    // Don't delete — just mark the clear timestamp
    await ChatClear.findOneAndUpdate(
      { courseId, studentId: req.user._id },
      { clearedAt: new Date() },
      { upsert: true, new: true }
    );
    return res.status(200).json({ message: "Chat history cleared" });
  } catch (error) {
    console.error("Clear doubts error:", error.message);
    return res.status(500).json({ message: "Failed to clear history" });
  }
};

module.exports = { askCourseDoubt, getCourseDoubts, clearCourseDoubts };

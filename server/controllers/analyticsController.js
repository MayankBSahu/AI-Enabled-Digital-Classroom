const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const Doubt = require("../models/Doubt");
const User = require("../models/User");
const { askDoubt } = require("../utils/aiClient");

const getCourseAnalytics = async (req, res) => {
  const { courseId } = req.params;

  const assignments = await Assignment.find({ courseId }).select("_id maxMarks title rubric");
  const assignmentIds = assignments.map((a) => a._id);
  const maxMarksMap = new Map(assignments.map((a) => [a._id.toString(), a.maxMarks]));

  const submissions = await Submission.find({ assignmentId: { $in: assignmentIds }, status: "evaluated" })
    .select("assignmentId studentId aiResult.marks");

  const doubts = await Doubt.find({ courseId }).select("studentId question qualityScore");

  const studentPerf = new Map();

  submissions.forEach((sub) => {
    const key = sub.studentId.toString();
    if (!studentPerf.has(key)) {
      studentPerf.set(key, { earned: 0, max: 0 });
    }

    const entry = studentPerf.get(key);
    entry.earned += sub.aiResult?.marks || 0;
    entry.max += maxMarksMap.get(sub.assignmentId.toString()) || 0;
  });

  const weakStudentIds = Array.from(studentPerf.entries())
    .filter(([, perf]) => perf.max > 0 && (perf.earned / perf.max) < 0.5)
    .map(([studentId]) => studentId);

  const weakStudents = await User.find({ _id: { $in: weakStudentIds } }).select("name email");

  const topicMap = new Map();
  doubts.forEach((d) => {
    const topic = d.question.trim();
    if (topic.length > 8) {
      topicMap.set(topic, (topicMap.get(topic) || 0) + 1);
    }
  });

  const strugglingTopics = Array.from(topicMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([topic, count]) => ({ topic, count }));

  const recentDoubtQuestions = doubts.slice(-15).map(d => d.question).join("\n- ");
  let teachingSuggestionsText = "No student doubts yet to generate suggestions.";

  if (doubts.length > 0) {
    try {
      const ragResponse = await askDoubt({
        course_id: courseId,
        student_id: "professor_analytics_bot",
        question: `You are an AI teaching assistant. Based on these recent questions asked by students in the course:\n- ${recentDoubtQuestions}\n\nWhat are 3 specific, actionable teaching suggestions or topics the professor should cover next to clear up confusion? Focus strictly on these questions. Keep it brief.`,
        history: []
      });
      teachingSuggestionsText = ragResponse.answer;
    } catch (e) {
      console.error("AI Analytics error", e);
      teachingSuggestionsText = "Failed to generate AI teaching suggestions at this time.";
    }
  }

  return res.json({
    weakStudents,
    strugglingTopics,
    teachingSuggestions: teachingSuggestionsText,
    totalEvaluatedSubmissions: submissions.length,
    totalDoubts: doubts.length
  });
};

module.exports = { getCourseAnalytics };

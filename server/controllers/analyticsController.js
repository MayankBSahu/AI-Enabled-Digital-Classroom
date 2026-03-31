const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const Doubt = require("../models/Doubt");
const User = require("../models/User");

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
    const words = d.question.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 4);
    words.slice(0, 5).forEach((w) => topicMap.set(w, (topicMap.get(w) || 0) + 1));
  });

  const strugglingTopics = Array.from(topicMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([topic, count]) => ({ topic, count }));

  const teachingSuggestions = [
    "Reinforce top struggling topics using worked examples during the next class.",
    "Create short formative quizzes for weak students and track recovery weekly.",
    "Publish a rubric-aligned answer template before assignment deadlines."
  ];

  return res.json({
    weakStudents,
    strugglingTopics,
    teachingSuggestions,
    totalEvaluatedSubmissions: submissions.length,
    totalDoubts: doubts.length
  });
};

module.exports = { getCourseAnalytics };

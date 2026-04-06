const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const Doubt = require("../models/Doubt");
const Leaderboard = require("../models/Leaderboard");
const Course = require("../models/Course");
const { normalize, leaderboardTotal } = require("../utils/scoring");

const recomputeLeaderboard = async (req, res) => {
  const { courseId } = req.params;

  const assignments = await Assignment.find({ courseId }).select("_id maxMarks isProject");
  const assignmentIds = assignments.map((a) => a._id);
  const assignmentMeta = new Map(assignments.map((a) => [a._id.toString(), { maxMarks: a.maxMarks, isProject: !!a.isProject }]));

  const submissions = await Submission.find({ assignmentId: { $in: assignmentIds }, status: "evaluated" })
    .select("assignmentId studentId aiResult.marks");

  const doubts = await Doubt.find({ courseId }).select("studentId qualityScore createdAt");

  const studentMap = new Map();

  const upsertStudent = (studentId) => {
    const key = studentId.toString();
    if (!studentMap.has(key)) {
      studentMap.set(key, {
        studentId: key,
        assignmentTotal: 0,
        assignmentMaxTotal: 0,
        projectTotal: 0,
        projectMaxTotal: 0,
        doubtCount: 0,
        doubtQualityTotal: 0
      });
    }
    return studentMap.get(key);
  };

  const course = await Course.findOne({ courseId }).select("students");
  if (course && course.students) {
    course.students.forEach((studentId) => upsertStudent(studentId));
  }

  submissions.forEach((sub) => {
    const student = upsertStudent(sub.studentId);
    const meta = assignmentMeta.get(sub.assignmentId.toString());
    if (!meta) return;

    if (meta.isProject) {
      student.projectTotal += sub.aiResult?.marks || 0;
      student.projectMaxTotal += meta.maxMarks;
    } else {
      student.assignmentTotal += sub.aiResult?.marks || 0;
      student.assignmentMaxTotal += meta.maxMarks;
    }
  });

  doubts.forEach((doubt) => {
    const student = upsertStudent(doubt.studentId);
    student.doubtCount += 1;
    student.doubtQualityTotal += doubt.qualityScore || 0;
  });

  const rows = Array.from(studentMap.values()).map((student) => {
    const assignmentPercent = student.assignmentMaxTotal > 0
      ? (student.assignmentTotal / student.assignmentMaxTotal) * 100
      : 0;

    const assignmentNorm = normalize(assignmentPercent, 0, 100);

    const projectPercent = student.projectMaxTotal > 0
      ? (student.projectTotal / student.projectMaxTotal) * 100
      : 0;
    const projectNorm = normalize(projectPercent, 0, 100);
    const avgDoubtQuality = student.doubtCount > 0 ? student.doubtQualityTotal / student.doubtCount : 0;
    const doubtNorm = Math.min(100, (student.doubtCount * 5) + (avgDoubtQuality * 50));
    const totalScore = leaderboardTotal({ assignmentNorm, projectNorm, doubtNorm });

    return {
      courseId,
      studentId: student.studentId,
      assignmentScoreNorm: assignmentNorm,
      projectScoreNorm: projectNorm,
      doubtScoreNorm: doubtNorm,
      totalScore
    };
  }).sort((a, b) => b.totalScore - a.totalScore);

  const now = new Date();
  await Leaderboard.deleteMany({ courseId });

  const docs = rows.map((row, index) => ({
    ...row,
    rank: index + 1,
    snapshotDate: now
  }));

  if (docs.length > 0) {
    await Leaderboard.insertMany(docs);
  }

  return res.json({ leaderboard: docs });
};

const getLatestLeaderboard = async (req, res) => {
  const { courseId } = req.params;
  const leaderboard = await Leaderboard.find({ courseId })
    .populate("studentId", "name email")
    .sort({ rank: 1 });

  return res.json({ leaderboard });
};

module.exports = {
  recomputeLeaderboard,
  getLatestLeaderboard
};

const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const Doubt = require("../models/Doubt");
const Leaderboard = require("../models/Leaderboard");
const { normalize, leaderboardTotal } = require("../utils/scoring");

const recomputeLeaderboard = async (req, res) => {
  const { courseId } = req.params;

  const assignments = await Assignment.find({ courseId }).select("_id maxMarks");
  const assignmentIds = assignments.map((a) => a._id);
  const maxMarksByAssignment = new Map(assignments.map((a) => [a._id.toString(), a.maxMarks]));

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
        projectNorm: 0,
        doubtCount: 0,
        doubtQualityTotal: 0
      });
    }
    return studentMap.get(key);
  };

  submissions.forEach((sub) => {
    const student = upsertStudent(sub.studentId);
    const maxMarks = maxMarksByAssignment.get(sub.assignmentId.toString()) || 0;

    student.assignmentTotal += sub.aiResult?.marks || 0;
    student.assignmentMaxTotal += maxMarks;
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
    const projectNorm = student.projectNorm;
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

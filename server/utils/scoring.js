const normalize = (value, min, max) => {
  if (value === null || value === undefined) return 0;
  if (max <= min) return 0;
  const clamped = Math.max(min, Math.min(max, value));
  return ((clamped - min) / (max - min)) * 100;
};

const leaderboardTotal = ({ assignmentNorm, projectNorm, doubtNorm }) => {
  return (0.5 * assignmentNorm) + (0.3 * projectNorm) + (0.2 * doubtNorm);
};

module.exports = {
  normalize,
  leaderboardTotal
};

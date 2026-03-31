const ROLE_PATTERNS = {
  professor: /(prof|faculty|lecturer|hod|instructor)/i,
  student: /(student|ug|pg|btech|mtech|roll)/i
};

const inferRoleFromEmail = (email) => {
  if (!email) return "student";
  const normalized = email.toLowerCase();

  if (ROLE_PATTERNS.professor.test(normalized)) return "professor";
  if (ROLE_PATTERNS.student.test(normalized)) return "student";
  return "student";
};

module.exports = { inferRoleFromEmail };

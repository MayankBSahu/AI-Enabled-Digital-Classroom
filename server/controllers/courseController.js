const Course = require("../models/Course");

// Custom ID generator for enrollment
function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

exports.createCourse = async (req, res) => {
  try {
    const { courseId, name, description, icon, color } = req.body;
    if (!courseId || !name) {
      return res.status(400).json({ message: "Course ID and Name are required" });
    }

    let enrollmentCode = generateCode();
    // Ensure uniqueness loosely
    while (await Course.findOne({ enrollmentCode })) {
      enrollmentCode = generateCode();
    }

    const course = new Course({
      enrollmentCode,
      courseId,
      name,
      description,
      icon,
      color,
      professor: req.user._id,
      students: []
    });

    await course.save();
    res.status(201).json({ message: "Course created successfully", course });
  } catch (error) {
    console.error("Create course error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.enrollStudent = async (req, res) => {
  try {
    const { enrollmentCode } = req.body;
    if (!enrollmentCode) {
      return res.status(400).json({ message: "Enrollment code is required" });
    }

    const course = await Course.findOne({ enrollmentCode: enrollmentCode.toUpperCase() });
    if (!course) {
      return res.status(404).json({ message: "Invalid enrollment code. Course not found." });
    }

    if (course.students.includes(req.user._id)) {
      return res.status(400).json({ message: "You are already enrolled in this course." });
    }

    course.students.push(req.user._id);
    await course.save();

    res.status(200).json({ message: "Successfully enrolled in course!", course });
  } catch (error) {
    console.error("Enroll course error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.getEnrolledCourses = async (req, res) => {
  try {
    const courses = await Course.find({ students: req.user._id })
      .populate("professor", "name email")
      .select("-students"); // hide student list from general fetch
    res.status(200).json({ courses });
  } catch (error) {
    console.error("Get student courses error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.getProfessorCourses = async (req, res) => {
  try {
    const courses = await Course.find({ professor: req.user._id });
    res.status(200).json({ courses });
  } catch (error) {
    console.error("Get professor courses error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.getCourseStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findOne({ courseId: id })
      .populate("professor", "name email role")
      .populate("students", "name email role");
      
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    
    // Verify user is professor or enrolled student
    const isProfessor = course.professor._id.toString() === req.user._id.toString();
    const isStudent = course.students.some(s => s._id.toString() === req.user._id.toString());
    
    if (!isProfessor && !isStudent && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    res.status(200).json({ 
      professor: course.professor,
      students: course.students 
    });
  } catch (error) {
    console.error("Get course students error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

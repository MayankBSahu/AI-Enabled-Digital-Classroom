# Database Schema

## Overview

MongoDB collections for the AI Digital Classroom platform:

## 1. Users Collection

```javascript
{
  _id: ObjectId,
  email: String,          // user@example.edu
  password: String,       // hashed password
  role: String,           // "student" | "professor"
  name: String,
  studentId: String,      // for students
  employeeId: String,     // for professors
  courses: [ObjectId],    // references to Course documents
  createdAt: Date,
  updatedAt: Date
}
```

## 2. Courses Collection

```javascript
{
  _id: ObjectId,
  name: String,           // "Computer Science 101"
  code: String,           // "CS101"
  professor: ObjectId,    // reference to User document
  students: [ObjectId],   // references to User documents
  description: String,
  startDate: Date,
  endDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## 3. Materials Collection (Slides & Notes)

```javascript
{
  _id: ObjectId,
  courseId: ObjectId,     // reference to Course
  title: String,          // "Lecture 1: Introduction"
  type: String,           // "slide" | "note"
  fileName: String,       // original file name
  filePath: String,       // path in storage
  uploadDate: Date,
  uploader: ObjectId,     // reference to User (professor)
  vectorId: String        // ID in vector database
}
```

## 4. Assignments Collection

```javascript
{
  _id: ObjectId,
  courseId: ObjectId,     // reference to Course
  title: String,          // "Homework 1"
  description: String,
  dueDate: Date,
  maxMarks: Number,
  fileName: String,       // original file name
  filePath: String,       // path in storage
  uploadDate: Date,
  uploader: ObjectId,     // reference to User (professor)
  submissions: [ObjectId] // references to Submission documents
}
```

## 5. Submissions Collection

```javascript
{
  _id: ObjectId,
  assignmentId: ObjectId, // reference to Assignment
  studentId: ObjectId,    // reference to User
  fileName: String,       // original file name
  filePath: String,       // path in storage
  submissionDate: Date,
  marks: Number,          // AI evaluated marks
  feedback: String,       // AI generated feedback
  mistakes: [String],     // identified mistakes
  suggestions: [String],  // improvement suggestions
  aiEvaluated: Boolean,   // whether AI has processed
  aiEvaluationDate: Date  // when AI evaluation completed
}
```

## 6. Projects Collection

```javascript
{
  _id: ObjectId,
  courseId: ObjectId,     // reference to Course
  studentId: ObjectId,    // reference to User
  title: String,          // "Final Year Project"
  description: String,
  startDate: Date,
  endDate: Date,
  progressReports: [{
    reportNumber: Number,
    fileName: String,
    filePath: String,
    submissionDate: Date,
    aiFeedback: String,    // AI analysis of progress
    direction: String,     // "on-track" | "off-track"
    suggestions: [String]
  }]
}
```

## 7. Doubts Collection

```javascript
{
  _id: ObjectId,
  courseId: ObjectId,     // reference to Course
  studentId: ObjectId,    // reference to User
  question: String,       // student's question
  context: String,        // related material/content
  aiAnswer: String,       // AI generated answer
  sources: [String],      // sources used for answer (from RAG)
  createdAt: Date,
  resolved: Boolean
}
```

## 8. Announcements Collection

```javascript
{
  _id: ObjectId,
  courseId: ObjectId,     // reference to Course
  title: String,
  content: String,
  postedBy: ObjectId,     // reference to User (professor)
  postedAt: Date,
  attachments: [{
    fileName: String,
    filePath: String
  }]
}
```

## 9. Leaderboards Collection

```javascript
{
  _id: ObjectId,
  courseId: ObjectId,     // reference to Course
  type: String,           // "weekly" | "monthly" | "overall"
  generatedAt: Date,
  rankings: [{
    studentId: ObjectId,  // reference to User
    totalMarks: Number,   // sum of assignment marks
    projectScore: Number, // project progress score
    doubtScore: Number,   // based on quality/quantity of doubts
    overallScore: Number  // weighted composite score
  }]
}
```

## 10. Analytics Collection

```javascript
{
  _id: ObjectId,
  courseId: ObjectId,     // reference to Course
  analyticsType: String,  // "student_performance" | "topic_analysis"
  data: Object,           // analytics data structure
  generatedAt: Date,
  period: {               // for time-series data
    start: Date,
    end: Date
  }
}
```

## Indexes

For optimal performance, the following indexes should be created:

1. Users collection:
   - email (unique)
   - role
   - studentId/employeeId (unique)

2. Courses collection:
   - professor
   - students

3. Materials collection:
   - courseId
   - type
   - uploader

4. Assignments collection:
   - courseId
   - dueDate

5. Submissions collection:
   - assignmentId
   - studentId
   - aiEvaluated

6. Doubts collection:
   - courseId
   - studentId
   - createdAt
# Project Folder Structure

```
ai-digital-classroom/
├── client/                          # React frontend application
│   ├── public/                      # Static assets
│   │   ├── index.html               # Main HTML file
│   │   └── favicon.ico              # Favicon
│   ├── src/                         # Source code
│   │   ├── components/              # Reusable UI components
│   │   │   ├── auth/                # Authentication components
│   │   │   ├── dashboard/           # Dashboard components
│   │   │   ├── assignments/         # Assignment related components
│   │   │   ├── projects/            # Project related components
│   │   │   ├── doubts/              # Doubt solving components
│   │   │   └── leaderboard/         # Leaderboard components
│   │   ├── pages/                   # Page components
│   │   │   ├── Login.jsx            # Login page
│   │   │   ├── StudentDashboard.jsx # Student dashboard
│   │   │   ├── ProfessorDashboard.jsx # Professor dashboard
│   │   │   ├── AssignmentView.jsx   # Assignment viewing page
│   │   │   └── Profile.jsx          # User profile page
│   │   ├── assets/                  # Images, icons, styles
│   │   ├── utils/                   # Utility functions
│   │   ├── services/                # API service functions
│   │   ├── contexts/                # React contexts
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── App.jsx                  # Main App component
│   │   └── index.js                 # Entry point
│   ├── package.json                 # Frontend dependencies
│   └── README.md                    # Frontend documentation
│
├── server/                          # Node.js/Express backend
│   ├── controllers/                 # Request handlers
│   │   ├── authController.js        # Authentication logic
│   │   ├── courseController.js      # Course management
│   │   ├── materialController.js    # Slides/notes management
│   │   ├── assignmentController.js  # Assignment management
│   │   ├── submissionController.js   # Submission management
│   │   ├── projectController.js     # Project management
│   │   ├── doubtController.js       # Doubt solving management
│   │   ├── announcementController.js # Announcement management
│   │   └── analyticsController.js   # Analytics management
│   ├── models/                      # Database models
│   │   ├── User.js                  # User schema
│   │   ├── Course.js                # Course schema
│   │   ├── Material.js              # Material schema
│   │   ├── Assignment.js            # Assignment schema
│   │   ├── Submission.js            # Submission schema
│   │   ├── Project.js               # Project schema
│   │   ├── Doubt.js                 # Doubt schema
│   │   ├── Announcement.js          # Announcement schema
│   │   ├── Leaderboard.js           # Leaderboard schema
│   │   └── Analytics.js             # Analytics schema
│   ├── routes/                      # API routes
│   │   ├── authRoutes.js            # Authentication routes
│   │   ├── courseRoutes.js          # Course routes
│   │   ├── materialRoutes.js        # Material routes
│   │   ├── assignmentRoutes.js      # Assignment routes
│   │   ├── submissionRoutes.js      # Submission routes
│   │   ├── projectRoutes.js         # Project routes
│   │   ├── doubtRoutes.js           # Doubt routes
│   │   ├── announcementRoutes.js    # Announcement routes
│   │   ├── leaderboardRoutes.js     # Leaderboard routes
│   │   └── analyticsRoutes.js       # Analytics routes
│   ├── middleware/                  # Custom middleware
│   │   ├── authMiddleware.js        # Authentication middleware
│   │   ├── roleMiddleware.js        # Role-based access control
│   │   ├── uploadMiddleware.js      # File upload middleware
│   │   └── errorMiddleware.js       # Error handling middleware
│   ├── config/                      # Configuration files
│   │   ├── db.js                    # Database connection
│   │   ├── cloudStorage.js          # Cloud storage config
│   │   └── jwtConfig.js             # JWT configuration
│   ├── utils/                       # Utility functions
│   ├── validators/                  # Input validation
│   ├── uploads/                     # Uploaded files storage
│   │   ├── slides/                  # Uploaded slides
│   │   ├── notes/                   # Uploaded notes
│   │   ├── assignments/             # Assignment files
│   │   ├── submissions/             # Student submissions
│   │   └── projects/                # Project reports
│   ├── logs/                        # Log files
│   ├── server.js                    # Entry point
│   └── package.json                 # Backend dependencies
│
├── microservices/                   # AI microservices
│   └── ai-service/                  # Python AI service
│       ├── rag/                     # Retrieval Augmented Generation
│       │   ├── document_processor.py # Process documents for RAG
│       │   ├── vector_store.py      # Vector database interface
│       │   └── retriever.py         # Document retrieval logic
│       ├── doubt_solver/            # Doubt solving AI
│       │   ├── doubt_processor.py   # Process student doubts
│       │   └── answer_generator.py  # Generate answers from RAG
│       ├── assignment_evaluator/    # Assignment evaluation AI
│       │   ├── evaluator.py         # Assignment evaluation logic
│       │   └── feedback_generator.py # Feedback generation
│       ├── progress_analyzer/       # Project progress analyzer
│       │   ├── analyzer.py          # Progress analysis logic
│       │   └── recommendation.py    # Improvement recommendations
│       ├── leaderboard_generator/   # Leaderboard generation
│       │   └── ranking_algorithm.py # Ranking algorithms
│       ├── teaching_assistant/      # Professor teaching assistant
│       │   ├── performance_analyzer.py # Student performance analysis
│       │   └── teaching_recommender.py # Teaching improvement suggestions
│       ├── app.py                   # FastAPI application
│       ├── requirements.txt         # Python dependencies
│       └── config.py                # AI service configuration
│
├── docs/                            # Documentation
│   ├── SYSTEM_ARCHITECTURE.md       # System architecture diagram
│   ├── DATABASE_SCHEMA.md           # Database schema documentation
│   ├── API_ENDPOINTS.md             # API endpoint documentation
│   ├── AI_WORKFLOW.md               # AI workflow explanation
│   ├── ALGORITHMS.md                # Algorithm documentation
│   └── DEPLOYMENT.md                # Deployment guide
│
├── docker-compose.yml               # Docker Compose configuration
├── README.md                        # Main project documentation
└── .gitignore                       # Git ignore file
```
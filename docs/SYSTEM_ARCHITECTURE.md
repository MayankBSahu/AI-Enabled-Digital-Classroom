# System Architecture

## Overview

The AI-Enabled Digital Classroom Platform follows a microservices architecture with three main components:

```
┌─────────────────┐    REST API    ┌─────────────────┐
│   React Client  │◄──────────────►│  Node.js Server │◄──┐
└─────────────────┘    Socket.IO   └─────────────────┘   │
                                   │                     │
                                   │           ┌─────────▼──────────┐
                                   │           │  MongoDB Database  │
                                   │           └────────────────────┘
                                   │
                        ┌──────────▼──────────┐
                        │  Python AI Service  │◄──┐
                        │                     │   │
                        │ - RAG Engine        │   │
                        │ - Assignment Evaluator│   │
                        │ - Progress Analyzer │   │
                        │ - Doubt Solver      │   │
                        │ - Leaderboard Gen   │   │
                        │ - Teaching Assistant│   │
                        └─────────────────────┘   │
                                                  │
                                        ┌─────────▼─────────┐
                                        │ Vector Database   │
                                        │ (FAISS/Pinecone)  │
                                        └───────────────────┘
```

## Component Details

### 1. React Client (Frontend)
- Role-based dashboards (Student/Professor)
- Assignment submission interface
- Doubt solving chat interface
- Progress tracking visualization
- Leaderboard display

### 2. Node.js Server (Backend)
- User authentication and authorization
- CRUD operations for course materials
- File upload/download handling
- WebSocket connections for real-time features
- API gateway for AI service communication

### 3. Python AI Service (Microservice)
- RAG-based document retrieval for doubt solving
- Assignment evaluation algorithms
- Student progress analysis
- Leaderboard generation algorithms
- Teaching assistance recommendations

## Data Flow

1. **User Authentication**: Client authenticates with Node.js server via JWT
2. **Content Management**: Professors upload materials stored in MongoDB/gridFS
3. **Assignment Submission**: Students submit assignments stored in file storage
4. **AI Processing**: Server triggers AI service for evaluation/analysis
5. **Vector Storage**: Course materials indexed in vector database for RAG
6. **Real-time Updates**: WebSocket connections for live notifications
7. **Analytics Dashboard**: Professors view performance metrics and insights

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼──┐   ┌──────▼──┐   ┌─────▼────────┐
│  Client  │   │ Server  │   │ AI Service   │
│ (React)  │   │(Node.js)│   │(Python/FastAPI)│
└──────────┘   └─────────┘   └──────────────┘
                     │              │
               ┌─────▼────┐   ┌─────▼────┐
               │ MongoDB  │   │ Vector DB│
               │ Database │   │          │
               └──────────┘   └──────────┘
```
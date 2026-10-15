# Exam Seating Auto Allocator — Full-Stack Cloud Architecture 🎓

A complete enterprise-grade **Full-Stack Application** developed with **Spring Boot 3**, **Spring Data JPA**, **Aiven Cloud Database (MySQL / PostgreSQL)**, and a modern responsive **Web UI** deployed across **Render** (Backend API) and **Vercel** (Frontend UI).

---

## 🏗️ Architecture & Cloud Deployments

| Component | Technology | Hosting Platform | Details |
| :--- | :--- | :--- | :--- |
| **Backend API** | Java 17, Spring Boot 3, JPA | **Render** | Dockerized Spring Boot REST Service with dynamic `$PORT` & `/api/health` |
| **Database** | MySQL / PostgreSQL | **Aiven Cloud** | Managed cloud database with SSL and auto schema migration |
| **Frontend UI** | HTML5, CSS3, Modern JS (ES6+) | **Vercel** | Responsive 2D seating matrix, live API sync & offline fallback |
| **Version Control** | Git / GitHub | **GitHub** | Push ready with multi-stage Dockerfile and deployment manifests |

---

## 📁 Repository Structure

```text
examseat/
├── Dockerfile                                  # Multi-stage Docker build for Render backend
├── .dockerignore                               # Docker context exclusions
├── render.yaml                                 # Render Blueprint specification
├── vercel.json                                 # Root Vercel routing configuration
├── .gitignore                                  # Git ignored patterns
├── pom.xml                                     # Maven dependencies (Spring Boot, JPA, MySQL, Postgres, H2)
├── sample_students.csv                         # Multi-department test roster (CSE, ECE, MECH, CIVIL)
│
├── frontend/                                   # Standalone Frontend for Vercel deployment
│   ├── index.html                              # Responsive Web Dashboard & Settings Modal
│   ├── styles.css                              # UI Design System & Printable layout
│   ├── app.js                                  # Live REST API Client + Anti-Cheating Engine
│   └── vercel.json                             # Vercel SPA rewrites & clean URLs
│
├── src/                                        # Spring Boot Backend Source Code
│   ├── main/
│   │   ├── java/com/exam/seating/
│   │   │   ├── ExamSeatingApplication.java     # Spring Boot Entry Point & Auto Seeder
│   │   │   ├── config/
│   │   │   │   └── CorsConfig.java             # Global CORS for Vercel <-> Render
│   │   │   ├── model/
│   │   │   │   ├── Hall.java                   # Hall Entity (with safe SQL column mappings)
│   │   │   │   ├── Student.java                # Student Entity
│   │   │   │   ├── Allocation.java             # Seat Allocation Entity
│   │   │   │   └── AllocationRequest.java      # Allocation Request DTO
│   │   │   ├── repository/
│   │   │   │   ├── HallRepository.java         # Spring Data JPA Repository
│   │   │   │   ├── StudentRepository.java      # Spring Data JPA Repository
│   │   │   │   └── AllocationRepository.java   # Spring Data JPA Repository
│   │   │   ├── service/
│   │   │   │   └── SeatingAllocationService.java # Core Interleaving & Anti-Cheating Algorithm
│   │   │   └── controller/
│   │   │       ├── HealthController.java       # Health Check Endpoint (/api/health)
│   │   │       ├── HallController.java         # REST Endpoints for /api/halls
│   │   │       ├── StudentController.java      # REST Endpoints for /api/students
│   │   │       └── AllocationController.java   # REST Endpoints for /api/allocations
│   │   └── resources/
│   │       ├── application.properties          # Port ${PORT:8080}, Aiven DB & Hibernate config
│   │       └── static/                         # Embedded Frontend (served directly if running standalone)
│   │           ├── index.html
│   │           ├── styles.css
│   │           └── app.js
└── README.md
```

---

## ☁️ Step-by-Step Deployment Guide

### 1. Push to GitHub

GitHub requires either a **Personal Access Token (PAT)** or SSH authentication (password authentication for Git was deprecated in 2021).

To create a GitHub Personal Access Token:
1. Go to **[github.com/settings/tokens](https://github.com/settings/tokens)** -> **Generate new token (classic)**.
2. Select scopes: `repo` (Full control of private repositories) and `workflow`.
3. Copy the generated token (`ghp_xxxxxxxxxxxxxxxxxxxx`).

Run in your terminal:
```bash
git init
git add .
git commit -m "Fix database column conflicts, configure Render, Vercel and Aiven cloud integration"
git branch -M main
git remote add origin https://<YOUR_GITHUB_USERNAME>:<YOUR_TOKEN>@github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git
git push -u origin main
```

---

### 2. Deploy Backend on Render with Aiven Database

1. **Log in to Render** ([render.com](https://render.com)).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Settings:
   - **Environment**: `Docker` (Render automatically uses the included `Dockerfile`).
   - **Region**: Any (e.g. Frankfurt or Oregon).
   - **Branch**: `main`.
5. Under **Environment Variables**, add the Aiven connection details:
   - `SPRING_DATASOURCE_URL`: `jdbc:mysql://<AIVEN_HOST>:<PORT>/<DATABASE>?sslMode=REQUIRED` (or `jdbc:postgresql://<AIVEN_HOST>:<PORT>/<DATABASE>?sslmode=require`)
   - `SPRING_DATASOURCE_USERNAME`: `<AIVEN_USER>` (e.g. `avnadmin`)
   - `SPRING_DATASOURCE_PASSWORD`: `<AIVEN_PASSWORD>`
   - `SPRING_JPA_HIBERNATE_DDL_AUTO`: `update`
6. Click **Deploy Web Service**.
7. Once deployed, note down your Render service URL (e.g., `https://examseat-backend.onrender.com`).
   Verify by opening `https://examseat-backend.onrender.com/api/health` in your browser.

---

### 3. Deploy Frontend on Vercel

1. **Log in to Vercel** ([vercel.com](https://vercel.com)).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository.
4. In **Project Settings**:
   - **Root Directory**: Select `frontend` (or leave as root `.`, since root `vercel.json` automatically routes to frontend).
   - **Framework Preset**: `Other`.
5. Click **Deploy**.
6. When the deployment finishes, open your Vercel URL (e.g. `https://examseat.vercel.app`).
7. In the sidebar footer, click **⚙️ Backend Settings** (or the status card), paste your Render Backend URL (`https://examseat-backend.onrender.com`), and click **Save & Connect**. The indicator will turn **🟢 Connected (Online)**!

---

## 💻 Local Development

### Option A: Standard Spring Boot (Embedded H2 / Local MySQL)
```bash
mvn spring-boot:run
```
- Web Application UI: `http://localhost:8080`
- H2 Console: `http://localhost:8080/h2-console`
- Health Check: `http://localhost:8080/api/health`

### Option B: Pure Standalone Java
```bash
javac -d . ExamSeatingApp.java
java com.exam.seating.ExamSeatingApp
```
Open `http://localhost:8080`.

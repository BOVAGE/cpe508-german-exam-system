# Prompt: Build GAP Examination System Frontend

Use the following detailed specification to implement the frontend for the **GAP Examination System**.

---

## 🛠️ Technology Stack & Key Libraries
* **Framework:** React (Vite template) with TypeScript
* **Styling:** Tailwind CSS (modern sleek aesthetics, dark mode by default or toggleable, glassmorphic card overlays, custom gradients)
* **Icons:** Lucide React (for navigation icons, status badges, utility buttons)
* **Routing:** React Router DOM v6
* **State Management & Server Cache:** TanStack Query v5 (React Query) for API synchronization, loading indicators, cache invalidation, and query retries
* **Tables:** TanStack Table v8 (for searchable, filterable, sortable, and paginated administrative tables)
* **HTTP Client:** Axios (configured with a global interceptor to automatically attach JWT Bearer tokens from localStorage/Cookies and handle expired tokens by redirecting to login)
* **Forms:** React Hook Form + Zod (for validation of coordinates, dates, emails, and nested arrays)

---

## 🧭 Application Structure & Routing Model

```text
/ (Public / Redirects to dashboard if logged in)
├── /login (Supports identifiers like Email or Registration Number)
├── /student (Student Portal - Guarded by Role.STUDENT)
│   ├── /student/dashboard (Active and eligible exams list)
│   ├── /student/exams/:examId/instructions (Instructions and eligibility check)
│   └── /student/exams/:examId/attempt (Locked exam room interface, timer, live autosaves)
├── /admin (Admin Portal - Guarded by Role.ADMIN)
│   └── /admin/dashboard (Tabs: Overview, Faculties, Departments, Courses, Lecturers, Students, Assignments)
└── /lecturer (Lecturer Portal - Guarded by Role.LECTURER)
    ├── /lecturer/dashboard (Assigned courses list)
    ├── /lecturer/courses/:courseId (Exams list under course)
    └── /lecturer/exams/:examId (Exam detail: Topics, Questions, Topic Configs, Eligible Students, Results Export)
```

---

## 💎 Design & Visual Aesthetics Guidelines
* **Harmonious Dark Theme:** Slate/Zinc backgrounds (`bg-slate-900`/`bg-slate-950`) with primary indigo/violet accents (`bg-indigo-600`, `text-indigo-400`).
* **Glassmorphism:** Use borders and backdrops (`bg-slate-900/60 backdrop-blur-md border border-slate-800`) for headers, navs, and modals to give a modern premium interface.
* **Component States:** Explicit skeletons, loaders, hover micro-animations (`hover:scale-[1.01] transition-all`), and beautiful error-boundary overlays.
* **Badges:** Colored status chips for Exam status (`Draft` = Yellow, `Published` = Green), and Attempt states (`In Progress` = Blue, `Submitted` = Emerald).

---

## 🔒 Authentication Flow
* **Login Form:** Accepts `identifier` (can be an email address or student registration number like `CPE/2021/001`) and `password`.
* **Token Handling:** Stores JWT in `localStorage` alongside user profile details (`role`, `firstName`, `lastName`).
* **Axios Interceptor:**
  ```typescript
  axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  ```
* **Auto-Routing:** Decodes token role and redirects appropriately:
  * `ADMIN` -> `/admin/dashboard`
  * `LECTURER` -> `/lecturer/dashboard`
  * `STUDENT` -> `/student/dashboard`

---

## 🔑 Role-Based Feature Modules

### 1. 🏢 Admin Dashboard (`/admin/dashboard`)
Provide a clean tabbed sidebar or top-navigation layout supporting:
* **Overview:** Summaries of totals (Faculties, Departments, Courses, Lecturers, Students).
* **Searchable CRUD Lists:** For **Faculties, Departments, Courses, Lecturers, and Students**:
  * Build a reusable data table component using **TanStack Table v8**.
  * **Table Utilities:** Global text search input, paginated bottom nav, sort headers.
  * **Action Column:** Includes an "Edit" button (opening a modal with pre-populated form fields) and a "Delete" button (triggers a safety confirmation modal).
  * **Relations Mapping:**
    * When creating a Department, fetch and display a dropdown of available Faculties.
    * When creating a Course, display a dropdown of Departments.
    * When creating a Student/Lecturer, display a dropdown of Departments.
* **Bulk Student Import:** An "Import Students" button that opens a file upload modal. It accepts an Excel sheet (`.xlsx`), uploads it via multipart form-data to `POST /users/import-students`, and renders a summary toast of successful records and error listings for unmatched records.
* **Course to Lecturer Assignments:**
  * Form inputs: Lecturer (Dropdown), Course (Dropdown), Academic Year (e.g., `2025/2026`), Session (`Harmattan` or `Rain`).
  * Submits to `POST /course-assignments`. Shows list of current assignments with deletion controls.

---

### 2. 🎓 Lecturer Dashboard (`/lecturer/dashboard`)
* **Overview:** Displays card listings of assigned courses (fetched from `/courses` or assigned course mappings).
* **Course Detail Page (`/lecturer/courses/:courseId`):**
  * Displays lists of exams under this course.
  * **Create Exam Form:** Modal or slide-out form with fields: `title`, `description`, `scheduledStart` (ISO date picker), `scheduledEnd` (ISO date picker), `duration` (integer minutes), `gradingMode` (`STRICT`/`NON_STRICT`), `examKind` (`MID_SEMESTER`/`END_OF_SEMESTER`), `status` (`DRAFT`/`PUBLISHED`).
* **Exam Detail Panel (`/lecturer/exams/:examId`):**
  A tabbed control panel divided into:
  1. **Topics Tab (CRUD):** Add/Edit/Delete topics for this exam.
  2. **Questions Tab (CRUD):** 
     * Renders a list of current questions, grouped by topic.
     * **Create Question Interface:**
       * Select Topic (Dropdown).
       * Question Textarea: Input text containing `{{gap:1}}`, `{{gap:2}}` placeholders.
       * Gap Editor Section: Automatically parses entered placeholders and renders settings for each position. Allows setting score points (default `1.0`) and typing accepted answers (as comma-separated text or tags).
       * Dependability: A checkbox to toggle "This question depends on another". When checked, shows a dropdown listing previous questions in the same topic to set `previousQuestionId` (prevents self-referencing and circular linkages).
  3. **Topic Distribution Config Tab:**
     * Displays a list of exam topics. Lecturers input the target number of questions to randomly draw from each topic (upserting to `POST /exams/topic-configs`).
     * Renders inline warning/validation if the requested count cannot be formed by the questions available due to linear chain dependencies (matching backend HTTP 400 feedback).
  4. **Eligible Students Tab:**
     * Lists registered students.
     * Individual student search and registration.
     * Excel participant import button: Uploads eligible registration numbers from an Excel sheet to `POST /exams/:examId/import-participants`. Reports details of non-existent registration numbers in an error banner.
  5. **Export Results Tab:**
     * A button that initiates file download of the styled results sheet (`GET /exams/:examId/export-results`), saving it directly to local files.

---

### 3. 📝 Student Exam Room Flow (`/student`)
* **Dashboard (`/student/dashboard`):**
  * Displays cards for registered eligible exams.
  * Shows countdown badges for exams starting soon, and active "Start Exam" buttons for exams currently within scheduled windows.
* **Instructions Screen (`/student/exams/:examId/instructions`):**
  * Shows exam duration, title, course, grading mode, and instructions.
  * Checks attempt eligibility. Click "Start Exam" to start the attempt.
* **Exam Portal Workspace (`/student/exams/:examId/attempt`):**
  * **Layout:** Dual pane (Left: Navigator panel; Right: Question area).
  * **Navigator Panel:** Renders grid buttons of all exam questions. Shows state changes using borders or background colors:
    * `Empty Gray`: Unattempted question.
    * `Yellow`: Answer entered, pending server save.
    * `Green`: Answer saved successfully.
  * **Header:** Real-time countdown timer. Highlights orange when under 5 minutes, red when under 1 minute.
  * **Question Area:**
    * Renders the question text dynamically. Custom parsing replaces `{{gap:X}}` tokens with inline input boxes:
      ```jsx
      // Example renderer:
      const parts = text.split(/(\{\{gap:\d+\}\})/g);
      return parts.map((part, index) => {
        const match = part.match(/\{\{gap:(\d+)\}\}/);
        if (match) {
          const position = parseInt(match[1]);
          return (
            <input 
              key={index}
              type="text"
              className="inline-block border-b border-indigo-400 bg-slate-900 px-2 py-0.5 text-center focus:outline-none focus:border-b-2"
              value={answers[questionId]?.[position] || ''}
              onChange={(e) => handleAnswerChange(questionId, position, e.target.value)}
            />
          );
        }
        return part;
      });
      ```
    * **Live Autosave:** Triggers a debounced (e.g., 500ms) save to `POST /exams/:examId/attempts/answers` containing `questionId`, `gapPosition`, and `answer`. Immediately updates navigator indicators to Green on successful server response.
  * **Timer Expiration / Auto Finalize:** If the countdown timer hits `00:00`, intercept inputs, show a "Time Expired" alert, and automatically post to `/exams/:examId/attempts/submit` to grade the attempt and block further editing.
  * **Manual Submission:** A "Submit Examination" button at the bottom of the page. Opens a modal asking "Are you sure you want to finalize your exam?". On confirm, requests `POST /exams/:examId/attempts/submit` and displays the grading results: Score, Percentage, and a "Return to Dashboard" action button.

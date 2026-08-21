You are a senior backend engineer helping me build a university examination system API.

We are building the backend for a CPE 508 Group Project called:

"GAP Examination System"

The system is a web-based fill-in-the-gap examination platform for a university.

IMPORTANT:
Do not redesign the requirements unnecessarily.
Do not introduce microservices or unnecessary infrastructure.
Do not assume students register for courses inside this system.
Do not use MongoDB.
Use NestJS + TypeScript + PostgreSQL.

==================================================
TECHNOLOGY STACK
==================================================

Backend:
- NestJS
- TypeScript
- REST API
- PostgreSQL
- Prisma ORM
- JWT authentication
- class-validator / class-transformer
- Swagger/OpenAPI
- ExcelJS or another appropriate .xlsx library for Excel import/export
- Jest for testing

Use Docker for PostgreSQL/local development if appropriate.

The frontend will be a separate React/TypeScript application, so design the API cleanly for a frontend client.

==================================================
SYSTEM USERS
==================================================

There are exactly three major roles:

1. ADMIN
2. LECTURER
3. STUDENT

Use a shared User model rather than separate authentication tables.

A User should contain common university account information.

The role determines permissions.

Students authenticate using their registration number and password.

The initial/default student password is their surname, but the system should allow them to change it after first login.

Passwords must never be stored in plaintext.

==================================================
ACADEMIC STRUCTURE
==================================================

The academic hierarchy is:

Faculty
  └── Department
       └── Course

A Course represents a university course such as CPE 508.

A course may have multiple examinations across a session/year, for example:

- Mid-Semester Test
- End-of-Semester Examination
- Quiz
- Other assessment types

An Exam belongs to exactly one Course.

==================================================
LECTURER COURSE ASSIGNMENT
==================================================

Lecturers must only be able to create/manage examinations for courses they are assigned to teach.

Therefore introduce a CourseAssignment entity that maps:

- lecturer/user
- course
- academic year/session

Example:

Lecturer A → CPE 508 → 2025/2026

This assignment is created/managed by an ADMIN.

A lecturer creating an exam must be authorized through this assignment.

Do not simply allow every lecturer to create exams for every course.

==================================================
EXAM
==================================================

An Exam belongs to one Course.

Exam fields should conceptually include:

- id
- courseId
- title
- description
- academicYear
- session
- examKind
- scheduledStart
- scheduledEnd
- duration
- gradingMode
- status
- createdBy / lecturer
- createdAt
- updatedAt

examKind may initially include:

- MID_SEMESTER
- END_OF_SEMESTER
- QUIZ
- OTHER

gradingMode should initially support:

- STRICT
- NON_STRICT

Exam scheduling rules:

scheduledStart = earliest time a student can begin
scheduledEnd = absolute examination deadline
duration = maximum duration for an individual attempt

The effective submission deadline is:

min(attempt.startedAt + exam.duration, exam.scheduledEnd)

The server must be authoritative for this rule.

Do not trust the frontend timer.

==================================================
TOPICS
==================================================

Topics are created under an Exam.

Do NOT create a global Topic → Course relationship.

The same course may have different topics in different examinations because the syllabus/content may change across academic years or assessments.

Therefore:

Course
  └── Exam
       └── Topic
            └── Question

A Topic should contain approximately:

- id
- examId
- title
- description
- createdAt
- updatedAt

The lecturer creates topics as part of creating/configuring an exam.

==================================================
QUESTIONS
==================================================

Questions belong to a Topic.

Question fields should conceptually include:

- id
- topicId
- questionText
- previousQuestionId (nullable self-referencing relation)
- createdAt
- updatedAt

Questions are fill-in-the-gap questions.

The stored question text should use a machine-readable gap placeholder rather than relying on a literal dash.

For example:

"The CPU consists of the {{gap:1}} and {{gap:2}}."

The backend should preserve the question structure, while the frontend renders these placeholders as input fields.

Do not make the backend dependent on a specific frontend rendering format.

==================================================
QUESTION DEPENDENCY / ORDER
==================================================

Some questions depend on previous questions.

Example:

Q1 → Q2 → Q3

The dependency is a self-referencing relationship on Question.

Do NOT create a separate QuestionChain entity unless a real requirement emerges later.

A question may reference its previous question through previousQuestionId.

Dependency chains must only exist within the same Topic.

Example:

Topic A:
Q1 → Q2 → Q3

is valid.

A question in Topic A must not depend on a question in Topic B.

The API/service layer must validate this.

Circular dependencies must be prevented.

Example:

Q1 → Q2 → Q3 → Q1

must be rejected.

When questions are randomized for a student, dependency order must never be broken.

A dependency chain should behave as an indivisible sequence during randomization.

Example:

[Q1 → Q2 → Q3]
[Q4]
[Q5 → Q6]

may become:

[Q4]
[Q5 → Q6]
[Q1 → Q2 → Q3]

but never:

Q2, Q4, Q1, Q6, Q5, Q3

==================================================
QUESTION GAPS
==================================================

A Question may contain one or more gaps.

Create a QuestionGap entity.

Conceptually:

Question
  └── QuestionGap
       └── AcceptedAnswer

QuestionGap should include approximately:

- id
- questionId
- position
- points

The points field should have a sensible default, such as 1.

The first version of the frontend does not need to expose per-gap scoring configuration, but the database should support it.

This allows future support for different points per gap without redesigning the database.

Gap position must determine which gap is rendered first, second, etc.

==================================================
ACCEPTED ANSWERS
==================================================

Each gap can have multiple accepted answers.

Example:

Question:
"The language developed by Guido van Rossum is {{gap:1}}."

Accepted answers:

Python
python

Create an AcceptedAnswer entity linked to QuestionGap.

Do not store multiple accepted answers as a comma-separated string.

==================================================
GRADING
==================================================

The exam has a gradingMode:

STRICT
NON_STRICT

STRICT:
- Normalize only what is explicitly defined as basic input cleanup.
- Compare against lecturer-defined accepted answers.
- Do not use fuzzy similarity unless explicitly configured.

NON_STRICT:
- Normalize the student's answer.
- Compare against accepted answers.
- Support tolerance for minor spelling errors using an appropriate similarity method such as Levenshtein/edit distance.
- The exact threshold/heuristic should be implemented in the grading service, not hard-coded into the Question database model.

Do not over-engineer the first implementation.

The architecture should allow the grading algorithm to evolve without changing the database structure.

==================================================
EXAM QUESTION DISTRIBUTION
==================================================

Questions are selected independently for EACH student's attempt.

Example:

Exam configuration:

Topic A → 10 questions
Topic B → 10 questions
Topic C → 10 questions

Student A may receive:
10 from A + 10 from B + 10 from C

Student B may receive a different random set:
10 from A + 10 from B + 10 from C

The distribution is therefore an Exam/Topic configuration.

Create an appropriate configuration entity, such as ExamTopicConfig, containing:

- examId
- topicId
- questionCount

The total number of questions should be derived from these topic distributions.

Do NOT allow contradictory configuration such as:

Topic A = 10
Topic B = 10
Topic C = 10
totalQuestions = 25

The total should be calculated as 30.

If dependency chains make the requested number impossible to satisfy exactly, the system should reject the exam configuration rather than silently producing an incorrect number of questions.

Dependency chains are indivisible during selection.

Example:

Chain A = 3 questions
Chain B = 2 questions
Independent Q = 1

Request = 5

Chain A + Chain B is valid.

If only chains of 3 and 3 are available and the lecturer requests 5, reject the configuration.

==================================================
EXAM PARTICIPANTS / ELIGIBILITY
==================================================

Students DO NOT register for courses through this system.

The university already has course registration information.

The lecturer obtains an Excel file from the university student portal containing students eligible for the examination/course.

The lecturer uploads the list to the examination system.

The important identifier in the import is the student's registration number.

Create an ExamParticipant entity:

- id
- examId
- studentId
- createdAt

This represents:

"this student is eligible to take this specific exam."

Do not duplicate student information in ExamParticipant.

The student data already exists in User/Student records.

If an imported registration number does not correspond to an existing student account, the import should report it as an error/unmatched record rather than silently ignoring it.

The system should support adding participants individually in addition to Excel import.

Prevent duplicate ExamParticipant records for the same exam/student combination.

==================================================
EXAM ATTEMPT
==================================================

A student may have at most ONE attempt for an exam.

Enforce this at the database level with an appropriate unique constraint:

(examId, studentId)

When the student starts an exam:

1. Authenticate the student.
2. Confirm they are an ExamParticipant.
3. Confirm the exam is currently available.
4. Confirm they do not already have an attempt.
5. Create an ExamAttempt.
6. Set startedAt.
7. Generate that student's question set.
8. Save the exact questions generated for that attempt.
9. Return the exam/questions to the frontend.

ExamAttempt should conceptually include:

- id
- examId
- studentId
- startedAt
- submittedAt
- status
- score
- percentage
- createdAt
- updatedAt

Attempt status should initially support:

- IN_PROGRESS
- SUBMITTED
- AUTO_SUBMITTED

The attempt must preserve whether it was manually submitted or automatically submitted.

==================================================
ATTEMPT QUESTIONS
==================================================

Because every student receives their own random question set, the system MUST record exactly which questions were shown to each student.

Create AttemptQuestion:

- id
- attemptId
- questionId
- displayOrder
- scoreAwarded

displayOrder represents the actual order in which the student saw the question.

This is important for auditability.

Do not rely on regenerating the random question set later.

The generated question set is part of the permanent attempt record.

==================================================
STUDENT ANSWERS
==================================================

Create AttemptGapAnswer:

- id
- attemptQuestionId
- questionGapId
- answer
- isCorrect
- scoreAwarded

Store the student's submitted answer even if it is blank.

The system should be able to reconstruct:

- which question the student saw
- which gap they answered
- what they entered
- whether it was correct
- how many points they received

Do not store only the final score.

The detailed attempt data is an audit trail.

==================================================
EXAM SUBMISSION
==================================================

Students can submit manually before their deadline.

If time expires:

- The server must determine that the attempt has expired.
- The system must automatically finalize/submit the attempt.
- Unanswered gaps should remain blank and receive zero points.
- The attempt status should become AUTO_SUBMITTED.

Do not depend solely on JavaScript running in the browser to auto-submit.

The API should reject or finalize attempts based on server-side timestamps.

The server must also enforce the exam scheduledEnd.

==================================================
GRADING
==================================================

When an attempt is submitted:

1. Retrieve the saved AttemptQuestions.
2. Retrieve the corresponding QuestionGaps.
3. Retrieve AcceptedAnswers.
4. Grade every submitted gap.
5. Calculate points.
6. Calculate total score.
7. Calculate percentage.
8. Save the grading result.
9. Mark the attempt as SUBMITTED or AUTO_SUBMITTED.

The score awarded at submission time must be preserved.

Old examination results should not change simply because the grading algorithm is improved later.

==================================================
RESULTS / EXCEL EXPORT
==================================================

The lecturer should be able to export results for an exam as an Excel file.

The result should include at least:

- Student name
- Registration number
- Department
- Score
- Total possible score
- Percentage
- Submission time
- Examination status

The result export should include eligible students even if they did not take/submit the exam, where appropriate.

For example:

Student A → 75 → SUBMITTED
Student B → 0 → NOT_ATTEMPTED
Student C → 62 → AUTO_SUBMITTED

Design the result query so that the lecturer can see the complete registered student list.

==================================================
AUTHORIZATION
==================================================

Implement role-based authorization.

ADMIN:
- Manage users
- Manage faculties/departments/courses
- Manage lecturer course assignments
- View/manage system data
- Manage/import students as appropriate

LECTURER:
- Access only courses they are assigned to teach
- Create/manage exams for assigned courses
- Create topics/questions
- Configure question distribution
- Upload eligible students
- View results
- Export results

STUDENT:
- Access only exams for which they are an ExamParticipant
- Start eligible exams
- Submit answers
- View their own appropriate results

A student must never be able to access another student's attempt/results by changing an ID in an API request.

==================================================
DATABASE / DESIGN PRINCIPLES
==================================================

Use PostgreSQL.

Use Prisma ORM.

Use UUIDs for primary keys unless there is a compelling reason otherwise.

Use foreign keys and database constraints properly.

Use unique constraints where business rules require them.

Use timestamps consistently.

Use transactions for operations that need atomicity, especially:

- starting an attempt
- finalizing/submitting an attempt
- grading an attempt
- importing participants

Avoid duplicated data.

Do not create unnecessary entities.

Do not create a global Topic table tied to Course.

Do not create a separate QuestionChain table.

Use Question.previousQuestionId for dependency chains.

Do not store accepted answers as JSON or comma-separated strings unless there is a strong technical reason.

Keep the relational structure normalized.

==================================================
API DESIGN
==================================================

Use RESTful endpoints.

Use DTOs for request validation.

Use guards for authentication and authorization.

Use Swagger/OpenAPI documentation.

Use consistent error responses.

Use pagination for potentially large lists.

Do not expose internal database implementation details unnecessarily.

Do not allow clients to submit arbitrary score values.

The server calculates scores.

==================================================
SECURITY
==================================================

Implement:

- password hashing
- JWT authentication
- role-based authorization
- DTO validation
- rate limiting where appropriate
- protection against unauthorized exam/attempt access
- server-side exam timing validation
- database constraints
- safe Excel file validation

Never trust:

- student-submitted score
- student-submitted correctness
- frontend timer
- frontend eligibility
- frontend exam status

==================================================
IMPORTANT DEVELOPMENT APPROACH
==================================================

Do NOT generate the entire application in one giant response.

Build incrementally.

First:

1. Analyze the requirements above.
2. Identify any remaining contradictions or missing decisions.
3. Propose the final domain model.
4. Show the proposed Prisma schema/entities and relationships.
5. Explain why each relationship exists.
6. Identify important constraints and indexes.
7. Wait for confirmation before generating the implementation.

After schema approval, proceed incrementally:

Phase 1:
- NestJS project setup
- Prisma/PostgreSQL setup
- configuration/environment handling
- User/authentication/roles

Phase 2:
- Faculty
- Department
- Course
- CourseAssignment

Phase 3:
- Exam
- Topic
- Question
- QuestionGap
- AcceptedAnswer
- dependency validation

Phase 4:
- ExamTopicConfig
- ExamParticipant
- Excel student import

Phase 5:
- ExamAttempt
- AttemptQuestion
- AttemptGapAnswer
- question generation/randomization
- dependency-preserving randomization

Phase 6:
- grading engine
- strict/non-strict grading
- Levenshtein/similarity logic

Phase 7:
- exam submission
- auto-submission
- result calculation

Phase 8:
- result export to Excel

Phase 9:
- tests
- Swagger
- security review
- edge cases

For every phase:
- explain the design briefly
- show the files being created/modified
- provide production-quality code
- include appropriate validation
- include tests for important business logic
- do not rewrite unrelated parts of the project

==================================================
IMPORTANT EDGE CASES TO ACCOUNT FOR
==================================================

At minimum, design for:

1. Lecturer attempts to create an exam for a course they are not assigned.
2. Topic has fewer questions than the requested distribution.
3. Requested question count cannot be satisfied because of dependency chains.
4. Circular question dependency.
5. Dependency between questions belonging to different topics.
6. Student not registered as an ExamParticipant.
7. Student tries to start an exam before scheduledStart.
8. Student tries to start after scheduledEnd.
9. Student already has an attempt.
10. Student refreshes the examination page.
11. Student loses network connection.
12. Student submits after the deadline.
13. Exam expires while the student is answering.
14. Blank answers.
15. Multiple gaps in one question.
16. Partial score across multiple gaps.
17. Multiple accepted answers.
18. Strict vs non-strict grading.
19. Minor spelling mistakes in non-strict mode.
20. Duplicate registration numbers in Excel.
21. Registration number in Excel does not exist in the system.
22. Student is added to an exam twice.
23. Lecturer edits a question after students have already started.
24. Lecturer changes exam distribution after attempts exist.
25. Result export must preserve the final recorded score.
26. Student attempts to access another student's attempt through the API.

For questions 23 and 24, recommend an appropriate exam lifecycle/status model that prevents dangerous modifications once students have started.

==================================================
CODE QUALITY EXPECTATIONS
==================================================

Write code as if this will be maintained by a team.

Prefer:

- clear module boundaries
- small services
- DTO validation
- explicit business logic
- transactions
- meaningful naming
- reusable utilities
- unit tests for grading/randomization
- integration/e2e tests for critical flows

Avoid:

- giant controllers
- business logic inside controllers
- magic numbers
- duplicated validation
- unnecessary abstractions
- over-engineering

Do not assume a feature exists just because it would be useful.

If a requirement is ambiguous, explicitly identify it and recommend a decision rather than silently inventing behavior.

Start by producing the FINAL DOMAIN MODEL + PRISMA SCHEMA proposal only.
Do not start implementing controllers/services yet.
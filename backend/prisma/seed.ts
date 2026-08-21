import { PrismaClient, Role, ExamKind, GradingMode, ExamStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding rich test dataset...');

  // 1. Create Faculty
  const faculty = await prisma.faculty.upsert({
    where: { code: 'SCI_TECH' },
    update: {},
    create: {
      name: 'Faculty of Science and Technology',
      code: 'SCI_TECH',
    },
  });
  console.log(`- Seeded Faculty: ${faculty.name}`);

  // 2. Create Department
  const department = await prisma.department.upsert({
    where: { code: 'CPE' },
    update: {},
    create: {
      name: 'Computer Engineering',
      code: 'CPE',
      facultyId: faculty.id,
    },
  });
  console.log(`- Seeded Department: ${department.name}`);

  // 3. Create Course
  const course = await prisma.course.upsert({
    where: { code: 'CPE 508' },
    update: {},
    create: {
      name: 'Microprocessor Systems and Integration',
      code: 'CPE 508',
      departmentId: department.id,
    },
  });
  console.log(`- Seeded Course: ${course.name}`);

  // 4. Create Users (Admin, Lecturers, Students)
  const passwordHash = await bcrypt.hash('password123', 10);
  const adminPassword = await bcrypt.hash('adminpassword123', 10);

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gap.edu' },
    update: {},
    create: {
      email: 'admin@gap.edu',
      password: adminPassword,
      role: Role.ADMIN,
      firstName: 'System',
      lastName: 'Admin',
      departmentId: department.id,
    },
  });
  console.log(`- Seeded Admin: ${admin.email}`);

  // Lecturers
  const lecturer1 = await prisma.user.upsert({
    where: { email: 'lecturer1@gap.edu' },
    update: {},
    create: {
      email: 'lecturer1@gap.edu',
      password: passwordHash,
      role: Role.LECTURER,
      firstName: 'Dr. John',
      lastName: 'Doe',
      departmentId: department.id,
    },
  });
  const lecturer2 = await prisma.user.upsert({
    where: { email: 'lecturer2@gap.edu' },
    update: {},
    create: {
      email: 'lecturer2@gap.edu',
      password: passwordHash,
      role: Role.LECTURER,
      firstName: 'Dr. Jane',
      lastName: 'Smith',
      departmentId: department.id,
    },
  });
  console.log(`- Seeded Lecturers: ${lecturer1.email}, ${lecturer2.email}`);

  // Students (Default passwords set to their lowercase surname)
  const studentData = [
    { email: 'student1@gap.edu', reg: 'CPE/2021/001', first: 'Alice', last: 'Smith' },
    { email: 'student2@gap.edu', reg: 'CPE/2021/002', first: 'Bob', last: 'Jones' },
    { email: 'student3@gap.edu', reg: 'CPE/2021/003', first: 'Charlie', last: 'Brown' },
    { email: 'student4@gap.edu', reg: 'CPE/2021/004', first: 'Diana', last: 'Prince' },
    { email: 'student5@gap.edu', reg: 'CPE/2021/005', first: 'Evan', last: 'Wright' },
  ];

  const students: any[] = [];
  for (const s of studentData) {
    const defaultPassword = s.last.toLowerCase();
    const studentHashedPass = await bcrypt.hash(defaultPassword, 10);
    const user = await prisma.user.upsert({
      where: { registrationNumber: s.reg },
      update: {},
      create: {
        email: s.email,
        registrationNumber: s.reg,
        password: studentHashedPass,
        role: Role.STUDENT,
        firstName: s.first,
        lastName: s.last,
        departmentId: department.id,
      },
    });
    students.push(user);
  }
  console.log(`- Seeded ${students.length} Student accounts (Passwords set to their lowercase surnames)`);

  // 5. Create Course Assignment for lecturer1
  const assignment = await prisma.courseAssignment.upsert({
    where: {
      lecturerId_courseId_academicYear_session: {
        lecturerId: lecturer1.id,
        courseId: course.id,
        academicYear: '2025/2026',
        session: 'Rain',
      },
    },
    update: {},
    create: {
      lecturerId: lecturer1.id,
      courseId: course.id,
      academicYear: '2025/2026',
      session: 'Rain',
    },
  });
  console.log(`- Seeded Course Assignment: ${lecturer1.firstName} assigned to ${course.code}`);

  // 6. Create active, published Exam
  const now = new Date();
  const scheduledStart = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
  const scheduledEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

  const exam = await prisma.exam.create({
    data: {
      courseId: course.id,
      title: 'CPE 508 Mid-Semester Test',
      description: 'Attempt all questions. Spelling error tolerance is enabled (Non-strict mode).',
      academicYear: '2025/2026',
      session: 'Rain',
      examKind: ExamKind.MID_SEMESTER,
      scheduledStart,
      scheduledEnd,
      duration: 30,
      gradingMode: GradingMode.NON_STRICT,
      status: ExamStatus.PUBLISHED,
      createdById: lecturer1.id,
    },
  });
  console.log(`- Seeded Exam: "${exam.title}" (PUBLISHED, active)`);

  // 7. Seed Topic 1 & Questions under Exam
  const topic1 = await prisma.topic.create({
    data: {
      examId: exam.id,
      title: 'Microprocessor Fundamentals',
      description: 'Basics of CPU structure and cache layers.',
    },
  });

  // Topic 1 - Question 1
  const q1 = await prisma.question.create({
    data: {
      topicId: topic1.id,
      questionText: 'The CPU consists of the {{gap:1}} and the {{gap:2}}.',
    },
  });
  await prisma.questionGap.create({
    data: {
      questionId: q1.id,
      position: 1,
      points: 1.0,
      acceptedAnswers: {
        create: [{ answer: 'ALU' }, { answer: 'Arithmetic Logic Unit' }],
      },
    },
  });
  await prisma.questionGap.create({
    data: {
      questionId: q1.id,
      position: 2,
      points: 1.0,
      acceptedAnswers: {
        create: [{ answer: 'Control Unit' }, { answer: 'CU' }],
      },
    },
  });

  // Topic 1 - Question 2 (Depends on Q1)
  const q2 = await prisma.question.create({
    data: {
      topicId: topic1.id,
      questionText: 'A standard 8-bit register can store integer values between 0 and {{gap:1}}.',
      previousQuestionId: q1.id,
    },
  });
  await prisma.questionGap.create({
    data: {
      questionId: q2.id,
      position: 1,
      points: 1.0,
      acceptedAnswers: {
        create: [{ answer: '255' }],
      },
    },
  });
  console.log(`- Seeded Topic 1 with 2 Questions (Linear Chain: Q1 -> Q2)`);

  // 8. Seed Topic 2 & Questions
  const topic2 = await prisma.topic.create({
    data: {
      examId: exam.id,
      title: 'Assembly Programming',
      description: 'Seeding assembly instructions concepts.',
    },
  });

  // Topic 2 - Question 3
  const q3 = await prisma.question.create({
    data: {
      topicId: topic2.id,
      questionText: 'In assembly language, the {{gap:1}} instruction is typically used to copy data from source to destination.',
    },
  });
  await prisma.questionGap.create({
    data: {
      questionId: q3.id,
      position: 1,
      points: 1.0,
      acceptedAnswers: {
        create: [{ answer: 'MOV' }, { answer: 'mov' }],
      },
    },
  });

  // Topic 2 - Question 4 (Depends on Q3)
  const q4 = await prisma.question.create({
    data: {
      topicId: topic2.id,
      questionText: 'The instruction used to add values together is {{gap:1}}.',
      previousQuestionId: q3.id,
    },
  });
  await prisma.questionGap.create({
    data: {
      questionId: q4.id,
      position: 1,
      points: 1.0,
      acceptedAnswers: {
        create: [{ answer: 'ADD' }, { answer: 'add' }],
      },
    },
  });
  console.log(`- Seeded Topic 2 with 2 Questions (Linear Chain: Q3 -> Q4)`);

  // 9. Seed Topic Distribution Configs
  await prisma.examTopicConfig.create({
    data: {
      examId: exam.id,
      topicId: topic1.id,
      questionCount: 2,
    },
  });
  await prisma.examTopicConfig.create({
    data: {
      examId: exam.id,
      topicId: topic2.id,
      questionCount: 2,
    },
  });
  console.log(`- Seeded Topic Configs (2 questions from Topic 1, 2 questions from Topic 2)`);

  // 10. Register eligible student participants (student1, student2)
  await prisma.examParticipant.create({
    data: {
      examId: exam.id,
      studentId: students[0].id,
    },
  });
  await prisma.examParticipant.create({
    data: {
      examId: exam.id,
      studentId: students[1].id,
    },
  });
  console.log(`- Registered eligible participants: ${students[0].firstName} (${students[0].registrationNumber}) and ${students[1].firstName} (${students[1].registrationNumber})`);

  console.log('\nSeeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

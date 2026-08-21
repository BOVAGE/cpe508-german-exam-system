import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { Role, ExamStatus, User } from '@prisma/client';

@Injectable()
export class ExamService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateExamDto, user: User) {
    // 1. If LECTURER, verify they are assigned to teach this course for the academic year & session
    if (user.role === Role.LECTURER) {
      const assignment = await this.prisma.courseAssignment.findUnique({
        where: {
          lecturerId_courseId_academicYear_session: {
            lecturerId: user.id,
            courseId: dto.courseId,
            academicYear: dto.academicYear,
            session: dto.session,
          },
        },
      });
      if (!assignment) {
        throw new ForbiddenException(
          `You are not assigned to teach this course (${dto.courseId}) in the academic year ${dto.academicYear} (${dto.session} session).`
        );
      }
    }

    // 2. Verify course exists
    const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
    if (!course) {
      throw new NotFoundException(`Course with ID ${dto.courseId} not found`);
    }

    // 3. Verify start date is before end date
    const start = new Date(dto.scheduledStart);
    const end = new Date(dto.scheduledEnd);
    if (start >= end) {
      throw new BadRequestException('scheduledStart must be earlier than scheduledEnd');
    }

    // 4. Create the exam
    return this.prisma.exam.create({
      data: {
        courseId: dto.courseId,
        title: dto.title,
        description: dto.description || null,
        academicYear: dto.academicYear,
        session: dto.session,
        examKind: dto.examKind,
        scheduledStart: start,
        scheduledEnd: end,
        duration: dto.duration,
        gradingMode: dto.gradingMode,
        createdById: user.id,
      },
      include: {
        course: true,
      },
    });
  }

  async findAll(user: User) {
    if (user.role === Role.ADMIN) {
      return this.prisma.exam.findMany({
        include: { course: true, creator: { select: { firstName: true, lastName: true } } },
      });
    }

    if (user.role === Role.LECTURER) {
      // Find exams created by the lecturer or for courses they are assigned to
      const assignments = await this.prisma.courseAssignment.findMany({
        where: { lecturerId: user.id },
      });
      const assignedCourseIds = assignments.map((a) => a.courseId);

      return this.prisma.exam.findMany({
        where: {
          OR: [
            { createdById: user.id },
            { courseId: { in: assignedCourseIds } },
          ],
        },
        include: { course: true, creator: { select: { firstName: true, lastName: true } } },
      });
    }

    if (user.role === Role.STUDENT) {
      // Students only see exams where they are an ExamParticipant
      return this.prisma.exam.findMany({
        where: {
          participants: {
            some: { studentId: user.id },
          },
          status: ExamStatus.PUBLISHED, // Only published exams for students
        },
        include: { course: true },
      });
    }

    return [];
  }

  async findOne(id: string, user: User) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        course: true,
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        topics: {
          include: {
            questions: {
              include: { gaps: { include: { acceptedAnswers: true } } },
            },
          },
        },
        topicConfigs: true,
      },
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID ${id} not found`);
    }

    // Authorization checks
    if (user.role === Role.LECTURER) {
      const isCreator = exam.createdById === user.id;
      const isAssigned = await this.prisma.courseAssignment.findFirst({
        where: { lecturerId: user.id, courseId: exam.courseId },
      });
      if (!isCreator && !isAssigned) {
        throw new ForbiddenException('You do not have access to this exam');
      }
    } else if (user.role === Role.STUDENT) {
      const isParticipant = await this.prisma.examParticipant.findUnique({
        where: { examId_studentId: { examId: id, studentId: user.id } },
      });
      if (!isParticipant) {
        throw new ForbiddenException('You are not registered to take this exam');
      }
      if (exam.status !== ExamStatus.PUBLISHED) {
        throw new ForbiddenException('This exam is not yet available');
      }
      
      // For students, we strip details like correct answers!
      // This is a critical security rule: never return accepted answers to a student.
      exam.topics.forEach((topic) => {
        topic.questions.forEach((q) => {
          q.gaps.forEach((gap) => {
            (gap as any).acceptedAnswers = undefined;
          });
        });
      });
    }

    return exam;
  }

  async update(id: string, dto: UpdateExamDto, user: User) {
    const exam = await this.prisma.exam.findUnique({ where: { id } });
    if (!exam) {
      throw new NotFoundException(`Exam with ID ${id} not found`);
    }

    // Verify lecturer authorization
    if (user.role === Role.LECTURER && exam.createdById !== user.id) {
      throw new ForbiddenException('You can only update exams you created');
    }

    // Check if attempts exist (Locking Model)
    const attemptsCount = await this.prisma.examAttempt.count({ where: { examId: id } });
    const hasAttempts = attemptsCount > 0;

    if (hasAttempts) {
      // Core configuration locks
      if (dto.duration !== undefined && dto.duration !== exam.duration) {
        throw new BadRequestException('Cannot modify exam duration once attempts have started');
      }
      if (dto.gradingMode !== undefined && dto.gradingMode !== exam.gradingMode) {
        throw new BadRequestException('Cannot modify grading mode once attempts have started');
      }
      if (dto.examKind !== undefined && dto.examKind !== exam.examKind) {
        throw new BadRequestException('Cannot modify exam kind once attempts have started');
      }
      if (dto.academicYear || dto.session) {
        throw new BadRequestException('Cannot modify academic year or session once attempts have started');
      }
      // Cannot transition back to DRAFT once attempts exist
      if (dto.status === ExamStatus.DRAFT) {
        throw new BadRequestException('Cannot set exam back to DRAFT status once attempts have started');
      }
    }

    const data: any = { ...dto };
    if (dto.scheduledStart) data.scheduledStart = new Date(dto.scheduledStart);
    if (dto.scheduledEnd) data.scheduledEnd = new Date(dto.scheduledEnd);

    // Validate date intervals if updated
    const start = data.scheduledStart || exam.scheduledStart;
    const end = data.scheduledEnd || exam.scheduledEnd;
    if (start >= end) {
      throw new BadRequestException('scheduledStart must be earlier than scheduledEnd');
    }

    return this.prisma.exam.update({
      where: { id },
      data,
      include: { course: true },
    });
  }

  async remove(id: string, user: User) {
    const exam = await this.prisma.exam.findUnique({ where: { id } });
    if (!exam) {
      throw new NotFoundException(`Exam with ID ${id} not found`);
    }

    if (user.role === Role.LECTURER && exam.createdById !== user.id) {
      throw new ForbiddenException('You can only delete exams you created');
    }

    // Lock check
    const attemptsCount = await this.prisma.examAttempt.count({ where: { examId: id } });
    if (attemptsCount > 0) {
      throw new BadRequestException('Cannot delete an exam that has active or completed student attempts');
    }

    await this.prisma.exam.delete({ where: { id } });
    return { message: 'Exam deleted successfully' };
  }

  // Helper method for other services to check lock state
  async checkExamLocked(examId: string) {
    const attemptsCount = await this.prisma.examAttempt.count({ where: { examId } });
    if (attemptsCount > 0) {
      throw new BadRequestException('This action is blocked because students have already started taking this exam');
    }
  }
}

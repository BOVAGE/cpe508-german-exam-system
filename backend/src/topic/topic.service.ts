import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { ExamService } from '../exam/exam.service';
import { Role, User } from '@prisma/client';

@Injectable()
export class TopicService {
  constructor(
    private prisma: PrismaService,
    private examService: ExamService,
  ) {}

  async create(dto: CreateTopicDto, user: User) {
    // 1. Verify Exam exists and check permissions
    const exam = await this.prisma.exam.findUnique({
      where: { id: dto.examId },
    });
    if (!exam) {
      throw new NotFoundException(`Exam with ID ${dto.examId} not found`);
    }

    if (user.role === Role.LECTURER && exam.createdById !== user.id) {
      throw new ForbiddenException(
        'You can only create topics for exams you created',
      );
    }

    // 2. Check lock state
    await this.examService.checkExamLocked(dto.examId);

    // 3. Verify uniqueness of topic title within this exam
    const existing = await this.prisma.topic.findUnique({
      where: {
        examId_title: {
          examId: dto.examId,
          title: dto.title,
        },
      },
    });
    if (existing) {
      throw new BadRequestException(
        `Topic with title "${dto.title}" already exists in this exam`,
      );
    }

    return this.prisma.topic.create({
      data: dto,
    });
  }

  async findAll(examId: string, user: User) {
    // Check permission to view exam
    await this.examService.findOne(examId, user);

    return this.prisma.topic.findMany({
      where: { examId },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });
  }

  async findOne(id: string, user: User) {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: {
        exam: true,
        questions: {
          include: { gaps: { include: { acceptedAnswers: true } } },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${id} not found`);
    }

    // Check permission via parent exam
    await this.examService.findOne(topic.examId, user);

    // Security: strip answers for students
    if (user.role === Role.STUDENT) {
      topic.questions.forEach((q) => {
        q.gaps.forEach((g) => {
          (g as any).acceptedAnswers = undefined;
        });
      });
    }

    return topic;
  }

  async update(id: string, dto: UpdateTopicDto, user: User) {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: { exam: true },
    });
    if (!topic) {
      throw new NotFoundException(`Topic with ID ${id} not found`);
    }

    if (user.role === Role.LECTURER && topic.exam.createdById !== user.id) {
      throw new ForbiddenException(
        'You can only update topics for exams you created',
      );
    }

    // Check lock state
    await this.examService.checkExamLocked(topic.examId);

    if (dto.title && dto.title !== topic.title) {
      const existing = await this.prisma.topic.findUnique({
        where: {
          examId_title: {
            examId: topic.examId,
            title: dto.title,
          },
        },
      });
      if (existing) {
        throw new BadRequestException(
          `Topic with title "${dto.title}" already exists in this exam`,
        );
      }
    }

    return this.prisma.topic.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, user: User) {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: { exam: true },
    });
    if (!topic) {
      throw new NotFoundException(`Topic with ID ${id} not found`);
    }

    if (user.role === Role.LECTURER && topic.exam.createdById !== user.id) {
      throw new ForbiddenException(
        'You can only delete topics for exams you created',
      );
    }

    // Check lock state
    await this.examService.checkExamLocked(topic.examId);

    await this.prisma.topic.delete({ where: { id } });
    return { message: 'Topic deleted successfully' };
  }
}

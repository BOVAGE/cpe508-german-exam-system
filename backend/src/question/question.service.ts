import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto, CreateGapDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { ExamService } from '../exam/exam.service';
import { Role, User } from '@prisma/client';

@Injectable()
export class QuestionService {
  constructor(
    private prisma: PrismaService,
    private examService: ExamService,
  ) {}

  // Helper: Extract gap positions from text
  private extractGapPositions(text: string): number[] {
    const regex = /\{\{gap:(\d+)\}\}/g;
    const positions: number[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      positions.push(parseInt(match[1], 10));
    }
    return positions.sort((a, b) => a - b);
  }

  // Helper: Validate gap configuration matches text placeholders
  private validateGapsWithText(text: string, gaps: CreateGapDto[]) {
    const textPositions = this.extractGapPositions(text);
    if (textPositions.length === 0) {
      throw new BadRequestException('Question text must contain at least one gap placeholder in the format {{gap:1}}');
    }

    // Check for duplicates in text placeholders
    const uniqueTextPositions = new Set(textPositions);
    if (uniqueTextPositions.size !== textPositions.length) {
      throw new BadRequestException('Duplicate gap placeholders found in question text');
    }

    const dtoPositions = gaps.map((g) => g.position);
    const uniqueDtoPositions = new Set(dtoPositions);

    if (uniqueDtoPositions.size !== dtoPositions.length) {
      throw new BadRequestException('Duplicate gap positions provided in gaps list');
    }

    // Verify DTO positions match text positions exactly
    for (const pos of textPositions) {
      if (!uniqueDtoPositions.has(pos)) {
        throw new BadRequestException(`Missing gap configuration for position ${pos} found in text`);
      }
    }

    for (const pos of dtoPositions) {
      if (!uniqueTextPositions.has(pos)) {
        throw new BadRequestException(`Configuration provided for gap position ${pos} which does not exist in question text`);
      }
    }
  }

  // Helper: Cycle detection in previousQuestionId pointers
  private async checkCircularDependency(currentQuestionId: string | null, newPreviousId: string | null) {
    if (!newPreviousId) return;
    let traceId: string | null | undefined = newPreviousId;
    const visited = new Set<string>();

    if (currentQuestionId) {
      visited.add(currentQuestionId);
    }

    while (traceId) {
      if (visited.has(traceId)) {
        throw new BadRequestException('Circular question dependency chain detected');
      }
      visited.add(traceId);

      const nextQ = await this.prisma.question.findUnique({
        where: { id: traceId },
        select: { previousQuestionId: true },
      });
      traceId = nextQ?.previousQuestionId;
    }
  }

  // Helper: Validate dependency topic match
  private async validateDependencyTopic(dtoTopicId: string, prevQuestionId: string | null) {
    if (!prevQuestionId) return;

    const prevQuestion = await this.prisma.question.findUnique({
      where: { id: prevQuestionId },
      select: { topicId: true },
    });

    if (!prevQuestion) {
      throw new NotFoundException(`Previous question with ID ${prevQuestionId} not found`);
    }

    if (prevQuestion.topicId !== dtoTopicId) {
      throw new BadRequestException('Dependent questions must belong to the same Topic');
    }
  }

  async create(dto: CreateQuestionDto, user: User) {
    // 1. Verify Topic exists
    const topic = await this.prisma.topic.findUnique({
      where: { id: dto.topicId },
      include: { exam: true },
    });
    if (!topic) {
      throw new NotFoundException(`Topic with ID ${dto.topicId} not found`);
    }

    // 2. Authorization
    if (user.role === Role.LECTURER && topic.exam.createdById !== user.id) {
      throw new ForbiddenException('You can only manage questions for exams you created');
    }

    // 3. Exam lock state validation
    await this.examService.checkExamLocked(topic.examId);

    // 4. Validate gap configuration vs text placeholders
    this.validateGapsWithText(dto.questionText, dto.gaps);

    // 5. Validate dependencies
    if (dto.previousQuestionId) {
      await this.validateDependencyTopic(dto.topicId, dto.previousQuestionId);
      await this.checkCircularDependency(null, dto.previousQuestionId);
    }

    // 6. Create in transaction
    return this.prisma.$transaction(async (tx) => {
      const question = await tx.question.create({
        data: {
          topicId: dto.topicId,
          questionText: dto.questionText,
          previousQuestionId: dto.previousQuestionId || null,
        },
      });

      for (const gapDto of dto.gaps) {
        await tx.questionGap.create({
          data: {
            questionId: question.id,
            position: gapDto.position,
            points: gapDto.points !== undefined ? gapDto.points : 1.0,
            acceptedAnswers: {
              create: gapDto.acceptedAnswers.map((answer) => ({
                // Normalize answer (trim whitespace)
                answer: answer.trim(),
              })),
            },
          },
        });
      }

      return tx.question.findUnique({
        where: { id: question.id },
        include: {
          gaps: {
            include: { acceptedAnswers: true },
          },
        },
      });
    });
  }

  async findAll(topicId: string, user: User) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
    });
    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    // Check permissions
    await this.examService.findOne(topic.examId, user);

    const questions = await this.prisma.question.findMany({
      where: { topicId },
      include: {
        gaps: {
          include: { acceptedAnswers: true },
        },
      },
    });

    // Strip answers for students
    if (user.role === Role.STUDENT) {
      questions.forEach((q) => {
        q.gaps.forEach((g) => {
          (g as any).acceptedAnswers = undefined;
        });
      });
    }

    return questions;
  }

  async findOne(id: string, user: User) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        topic: { include: { exam: true } },
        gaps: {
          include: { acceptedAnswers: true },
        },
      },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    // Check permissions
    await this.examService.findOne(question.topic.examId, user);

    // Strip answers for students
    if (user.role === Role.STUDENT) {
      question.gaps.forEach((g) => {
        (g as any).acceptedAnswers = undefined;
      });
    }

    return question;
  }

  async update(id: string, dto: UpdateQuestionDto, user: User) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        topic: { include: { exam: true } },
        gaps: true,
      },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    // Authorization
    if (user.role === Role.LECTURER && question.topic.exam.createdById !== user.id) {
      throw new ForbiddenException('You can only update questions for exams you created');
    }

    // Lock check
    await this.examService.checkExamLocked(question.topic.examId);

    // Validate date/text placeholders if both or either updated
    const textToValidate = dto.questionText !== undefined ? dto.questionText : question.questionText;
    const gapsToValidate = dto.gaps !== undefined ? dto.gaps : question.gaps.map((g) => ({
      position: g.position,
      points: g.points,
      acceptedAnswers: [], // not needed for structure validation
    }));

    if (dto.questionText !== undefined || dto.gaps !== undefined) {
      this.validateGapsWithText(textToValidate, gapsToValidate);
    }

    // Validate topic change
    if (dto.topicId && dto.topicId !== question.topicId) {
      const targetTopic = await this.prisma.topic.findUnique({
        where: { id: dto.topicId },
      });
      if (!targetTopic) {
        throw new NotFoundException(`Target Topic with ID ${dto.topicId} not found`);
      }
      if (targetTopic.examId !== question.topic.examId) {
        throw new BadRequestException('Cannot move a question to a topic in a different exam');
      }

      // Check if any other question depends on this one
      const dependentChild = await this.prisma.question.findFirst({
        where: { previousQuestionId: id },
        select: { id: true },
      });
      if (dependentChild) {
        throw new BadRequestException('Cannot change topic of a question that has dependent child questions in the original topic');
      }
    }

    // Validate dependencies
    const targetTopicId = dto.topicId !== undefined ? dto.topicId : question.topicId;
    const targetPrevId = dto.previousQuestionId !== undefined ? dto.previousQuestionId : question.previousQuestionId;

    if (targetPrevId) {
      if (targetPrevId === id) {
        throw new BadRequestException('A question cannot depend on itself');
      }
      await this.validateDependencyTopic(targetTopicId, targetPrevId);
      await this.checkCircularDependency(id, targetPrevId);
    }

    return this.prisma.$transaction(async (tx) => {
      // If gaps are updated, replace them
      if (dto.gaps) {
        // delete old gaps (cascades to acceptedAnswers)
        await tx.questionGap.deleteMany({
          where: { questionId: id },
        });

        // create new gaps
        for (const gapDto of dto.gaps) {
          await tx.questionGap.create({
            data: {
              questionId: id,
              position: gapDto.position,
              points: gapDto.points !== undefined ? gapDto.points : 1.0,
              acceptedAnswers: {
                create: gapDto.acceptedAnswers.map((answer) => ({
                  answer: answer.trim(),
                })),
              },
            },
          });
        }
      }

      // update question core properties
      return tx.question.update({
        where: { id },
        data: {
          questionText: dto.questionText,
          previousQuestionId: dto.previousQuestionId !== undefined ? dto.previousQuestionId : undefined,
          topicId: dto.topicId !== undefined ? dto.topicId : undefined,
        },
        include: {
          gaps: {
            include: { acceptedAnswers: true },
          },
        },
      });
    });
  }

  async remove(id: string, user: User) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        topic: { include: { exam: true } },
      },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    // Authorization
    if (user.role === Role.LECTURER && question.topic.exam.createdById !== user.id) {
      throw new ForbiddenException('You can only delete questions for exams you created');
    }

    // Lock check
    await this.examService.checkExamLocked(question.topic.examId);

    // Delete (cascades to gaps and accepted answers)
    await this.prisma.question.delete({ where: { id } });
    return { message: 'Question deleted successfully' };
  }
}

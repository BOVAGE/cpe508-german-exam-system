import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExamService } from '../exam/exam.service';
import { ExamTopicConfigService } from '../exam/exam-topic-config.service';
import { GradingService } from './grading.service';
import { Role, User, AttemptStatus, ExamStatus } from '@prisma/client';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { GetExamAttemptsDto } from './dto/get-exam-attempts.dto';

@Injectable()
export class ExamAttemptService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private examService: ExamService,
    private configService: ExamTopicConfigService,
    private gradingService: GradingService,
  ) {}

  onModuleInit() {
    // Run auto-submit background check every 60 seconds
    setInterval(() => {
      this.runCronAutoSubmit().catch((err) => {
        console.error('Background auto-submit error:', err);
      });
    }, 60000);
  }

  // Helper: Fisher-Yates Shuffle for arrays
  private shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Helper: Backtracking helper to find all block combinations that sum to target question count
  private findCombinations(
    blocks: { id: string; size: number; questionIds: string[] }[],
    target: number,
  ): { id: string; size: number; questionIds: string[] }[][] {
    const results: { id: string; size: number; questionIds: string[] }[][] = [];

    function backtrack(
      index: number,
      currentSum: number,
      currentSubset: { id: string; size: number; questionIds: string[] }[],
    ) {
      if (currentSum === target) {
        results.push([...currentSubset]);
        return;
      }
      if (currentSum > target || index >= blocks.length) {
        return;
      }

      // Include
      currentSubset.push(blocks[index]);
      backtrack(index + 1, currentSum + blocks[index].size, currentSubset);
      currentSubset.pop();

      // Exclude
      backtrack(index + 1, currentSum, currentSubset);
    }

    backtrack(0, 0, []);
    return results;
  }

  // Core Attempt Initiation endpoint
  async startAttempt(examId: string, student: User) {
    if (student.role !== Role.STUDENT) {
      throw new ForbiddenException(
        'Only student accounts can start exam attempts',
      );
    }

    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
    });
    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }

    // Confirm student is an ExamParticipant (Eligibility check)
    const isParticipant = await this.prisma.examParticipant.findUnique({
      where: {
        examId_studentId: {
          examId,
          studentId: student.id,
        },
      },
    });
    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not registered as an eligible participant for this exam',
      );
    }

    // Confirm the exam is currently available (Status and time checks)
    if (exam.status !== ExamStatus.PUBLISHED) {
      throw new ForbiddenException(
        'This exam is in DRAFT status and is not yet available',
      );
    }

    const now = new Date();
    if (now < exam.scheduledStart) {
      throw new ForbiddenException(
        `This exam has not started yet. It is scheduled to start at ${exam.scheduledStart.toISOString()}`,
      );
    }
    if (now > exam.scheduledEnd) {
      throw new ForbiddenException(
        'This exam has already ended. Access closed.',
      );
    }

    // Confirm they do not already have an attempt
    const existingAttempt = await this.prisma.examAttempt.findUnique({
      where: {
        examId_studentId: {
          examId,
          studentId: student.id,
        },
      },
    });
    if (existingAttempt) {
      throw new BadRequestException(
        'You have already started or submitted an attempt for this exam',
      );
    }

    // Generate the randomized question set based on the configs
    const configs = await this.prisma.examTopicConfig.findMany({
      where: { examId },
    });

    if (configs.length === 0) {
      throw new BadRequestException(
        'This exam does not have any topic distribution configurations configured yet',
      );
    }

    const selectedBlocks: {
      id: string;
      size: number;
      questionIds: string[];
    }[] = [];

    for (const config of configs) {
      const blocks = await this.configService.getTopicBlocks(config.topicId);
      const combinations = this.findCombinations(blocks, config.questionCount);

      if (combinations.length === 0) {
        throw new BadRequestException(
          `Unable to satisfy question distribution count (${config.questionCount}) for topic ID ${config.topicId} due to dependency chains.`,
        );
      }

      const randomCombination =
        combinations[Math.floor(Math.random() * combinations.length)];
      selectedBlocks.push(...randomCombination);
    }

    // Shuffle the combined set of blocks to randomize display order
    const shuffledBlocks = this.shuffle(selectedBlocks);

    // Flatten blocks into final questions list, keeping relative chain orders intact
    const finalQuestionIds: string[] = [];
    shuffledBlocks.forEach((block) => {
      finalQuestionIds.push(...block.questionIds);
    });

    // Write attempt and questions inside a transaction
    return this.prisma.$transaction(async (tx) => {
      const attempt = await tx.examAttempt.create({
        data: {
          examId,
          studentId: student.id,
          status: AttemptStatus.IN_PROGRESS,
          startedAt: now,
          score: 0.0,
          percentage: 0.0,
        },
      });

      // Insert generated questions into AttemptQuestion
      for (let i = 0; i < finalQuestionIds.length; i++) {
        await tx.attemptQuestion.create({
          data: {
            attemptId: attempt.id,
            questionId: finalQuestionIds[i],
            displayOrder: i + 1,
            scoreAwarded: 0.0,
          },
        });
      }

      return tx.examAttempt.findUnique({
        where: { id: attempt.id },
        include: {
          questions: {
            orderBy: { displayOrder: 'asc' },
            include: {
              question: {
                select: {
                  id: true,
                  questionText: true,
                  gaps: {
                    select: {
                      id: true,
                      position: true,
                      points: true,
                    },
                    orderBy: { position: 'asc' },
                  },
                },
              },
            },
          },
        },
      });
    });
  }

  // Retrieve current attempt state (checks deadline and auto-finalizes if necessary)
  async getAttemptState(examId: string, student: User) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: {
        examId_studentId: {
          examId,
          studentId: student.id,
        },
      },
      include: {
        exam: true,
        questions: {
          orderBy: { displayOrder: 'asc' },
          include: {
            question: {
              select: {
                id: true,
                questionText: true,
                gaps: {
                  select: {
                    id: true,
                    position: true,
                    points: true,
                  },
                  orderBy: { position: 'asc' },
                },
              },
            },
            gapAnswers: true,
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('No attempt record found for this exam');
    }

    // Lazy finalization check
    if (attempt.status === AttemptStatus.IN_PROGRESS) {
      const durationMs = attempt.exam.duration * 60 * 1000;
      const deadline = Math.min(
        attempt.startedAt.getTime() + durationMs,
        attempt.exam.scheduledEnd.getTime(),
      );
      const now = Date.now();

      if (now > deadline) {
        return this.finalizeAttempt(attempt.id, AttemptStatus.AUTO_SUBMITTED);
      }
    }

    return attempt;
  }

  // Save an answer for a single gap incrementally
  async saveAnswer(examId: string, dto: SubmitAnswerDto, student: User) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: {
        examId_studentId: {
          examId,
          studentId: student.id,
        },
      },
      include: { exam: true },
    });

    if (!attempt) {
      throw new NotFoundException('No active attempt found for this exam');
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Cannot save answer. Attempt status is ${attempt.status}`,
      );
    }

    // Deadline check
    const durationMs = attempt.exam.duration * 60 * 1000;
    const deadline = Math.min(
      attempt.startedAt.getTime() + durationMs,
      attempt.exam.scheduledEnd.getTime(),
    );
    const now = Date.now();

    if (now > deadline) {
      await this.finalizeAttempt(attempt.id, AttemptStatus.AUTO_SUBMITTED);
      throw new BadRequestException(
        'Exam time has expired. Your attempt has been automatically finalized.',
      );
    }

    // Find the AttemptQuestion
    const attemptQuestion = await this.prisma.attemptQuestion.findUnique({
      where: {
        attemptId_questionId: {
          attemptId: attempt.id,
          questionId: dto.questionId,
        },
      },
    });

    if (!attemptQuestion) {
      throw new NotFoundException(
        'Question does not belong to your randomized exam attempt',
      );
    }

    // Find the QuestionGap
    const gap = await this.prisma.questionGap.findUnique({
      where: {
        questionId_position: {
          questionId: dto.questionId,
          position: dto.gapPosition,
        },
      },
    });

    if (!gap) {
      throw new NotFoundException(
        `Gap position ${dto.gapPosition} not found in this question`,
      );
    }

    // Save the student's answer
    return this.prisma.attemptGapAnswer.upsert({
      where: {
        attemptQuestionId_questionGapId: {
          attemptQuestionId: attemptQuestion.id,
          questionGapId: gap.id,
        },
      },
      update: {
        answer: dto.answer,
      },
      create: {
        attemptQuestionId: attemptQuestion.id,
        questionGapId: gap.id,
        answer: dto.answer,
      },
    });
  }

  // Student manually triggers exam submission
  async submitAttempt(examId: string, student: User) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: {
        examId_studentId: {
          examId,
          studentId: student.id,
        },
      },
      include: { exam: true },
    });

    if (!attempt) {
      throw new NotFoundException('No active attempt found for this exam');
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Attempt has already been submitted (status is ${attempt.status})`,
      );
    }

    const durationMs = attempt.exam.duration * 60 * 1000;
    const deadline = Math.min(
      attempt.startedAt.getTime() + durationMs,
      attempt.exam.scheduledEnd.getTime(),
    );
    const now = Date.now();

    const finalStatus =
      now > deadline ? AttemptStatus.AUTO_SUBMITTED : AttemptStatus.SUBMITTED;
    return this.finalizeAttempt(attempt.id, finalStatus);
  }

  // Core finalization and grading procedure
  async finalizeAttempt(attemptId: string, finalStatus: AttemptStatus) {
    return this.prisma.$transaction(async (tx) => {
      const attempt = await tx.examAttempt.findUnique({
        where: { id: attemptId },
        include: {
          exam: true,
          questions: {
            include: {
              question: {
                include: {
                  gaps: {
                    include: { acceptedAnswers: true },
                  },
                },
              },
              gapAnswers: true,
            },
          },
        },
      });

      if (!attempt) {
        throw new NotFoundException(`Attempt with ID ${attemptId} not found`);
      }

      if (attempt.status !== AttemptStatus.IN_PROGRESS) {
        return attempt;
      }

      let totalExamScore = 0.0;
      let totalExamMaxPoints = 0.0;

      for (const attemptQ of attempt.questions) {
        let questionScore = 0.0;

        for (const gap of attemptQ.question.gaps) {
          totalExamMaxPoints += gap.points;

          const studentAnsRecord = attemptQ.gapAnswers.find(
            (ga) => ga.questionGapId === gap.id,
          );
          const studentAnsText = studentAnsRecord
            ? studentAnsRecord.answer
            : '';

          const acceptedAnsList = gap.acceptedAnswers.map((aa) => aa.answer);
          const isCorrect = this.gradingService.isAnswerCorrect(
            studentAnsText,
            acceptedAnsList,
            attempt.exam.gradingMode,
          );

          const pointsAwarded = isCorrect ? gap.points : 0.0;
          questionScore += pointsAwarded;

          await tx.attemptGapAnswer.upsert({
            where: {
              attemptQuestionId_questionGapId: {
                attemptQuestionId: attemptQ.id,
                questionGapId: gap.id,
              },
            },
            update: {
              isCorrect,
              scoreAwarded: pointsAwarded,
            },
            create: {
              attemptQuestionId: attemptQ.id,
              questionGapId: gap.id,
              answer: studentAnsText,
              isCorrect,
              scoreAwarded: pointsAwarded,
            },
          });
        }

        await tx.attemptQuestion.update({
          where: { id: attemptQ.id },
          data: { scoreAwarded: questionScore },
        });

        totalExamScore += questionScore;
      }

      const percentage =
        totalExamMaxPoints > 0
          ? (totalExamScore / totalExamMaxPoints) * 100
          : 0.0;

      return tx.examAttempt.update({
        where: { id: attemptId },
        data: {
          score: totalExamScore,
          percentage,
          submittedAt: new Date(),
          status: finalStatus,
        },
        include: {
          questions: {
            orderBy: { displayOrder: 'asc' },
            include: {
              question: {
                select: {
                  id: true,
                  questionText: true,
                  gaps: {
                    select: { id: true, position: true, points: true },
                  },
                },
              },
              gapAnswers: true,
            },
          },
        },
      });
    });
  }

  // Periodic Cron Trigger: finalizes expired attempts
  async runCronAutoSubmit() {
    const activeAttempts = await this.prisma.examAttempt.findMany({
      where: { status: AttemptStatus.IN_PROGRESS },
      include: { exam: true },
    });

    const now = Date.now();
    let autoSubmittedCount = 0;

    for (const attempt of activeAttempts) {
      const durationMs = attempt.exam.duration * 60 * 1000;
      const deadline = Math.min(
        attempt.startedAt.getTime() + durationMs,
        attempt.exam.scheduledEnd.getTime(),
      );

      if (now > deadline) {
        await this.finalizeAttempt(attempt.id, AttemptStatus.AUTO_SUBMITTED);
        autoSubmittedCount++;
      }
    }

    return { checkedCount: activeAttempts.length, autoSubmittedCount };
  }

  // Helper: verify admin or creator permissions for exam attempt management
  private async checkExamAdminOrCreator(examId: string, user: User) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }
    if (user.role === Role.LECTURER && exam.createdById !== user.id) {
      throw new ForbiddenException(
        'You are not authorized to manage attempts for this exam',
      );
    }
    return exam;
  }

  // Get paginated attempts for an exam (Admin/Lecturer)
  async getExamAttempts(examId: string, user: User, dto: GetExamAttemptsDto) {
    await this.checkExamAdminOrCreator(examId, user);

    const page = dto.page || 1;
    const limit = dto.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { examId };

    if (dto.status) {
      where.status = dto.status;
    }

    if (dto.search && dto.search.trim() !== '') {
      const search = dto.search.trim();
      where.student = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { registrationNumber: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [attempts, total] = await Promise.all([
      this.prisma.examAttempt.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              registrationNumber: true,
              email: true,
              department: {
                select: { name: true, code: true },
              },
            },
          },
        },
      }),
      this.prisma.examAttempt.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      attempts,
      total,
      page,
      limit,
      totalPages,
    };
  }

  // Delete a single attempt (Admin/Lecturer)
  async deleteAttempt(examId: string, attemptId: string, user: User) {
    await this.checkExamAdminOrCreator(examId, user);

    const attempt = await this.prisma.examAttempt.findFirst({
      where: { id: attemptId, examId },
    });

    if (!attempt) {
      throw new NotFoundException(
        `Attempt with ID ${attemptId} not found for this exam`,
      );
    }

    await this.prisma.examAttempt.delete({
      where: { id: attemptId },
    });

    return { message: 'Exam attempt successfully deleted' };
  }

  // Delete all attempts for an exam (Admin/Lecturer)
  async deleteAllAttempts(examId: string, user: User) {
    await this.checkExamAdminOrCreator(examId, user);

    const result = await this.prisma.examAttempt.deleteMany({
      where: { examId },
    });

    return {
      message: `Successfully reset/deleted ${result.count} exam attempt(s)`,
      deletedCount: result.count,
    };
  }
}

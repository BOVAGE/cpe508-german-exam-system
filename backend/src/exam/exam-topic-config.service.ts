import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamTopicConfigDto } from './dto/create-topic-config.dto';
import { ExamService } from './exam.service';
import { Role, User } from '@prisma/client';

@Injectable()
export class ExamTopicConfigService {
  constructor(
    private prisma: PrismaService,
    private examService: ExamService,
  ) {}

  // Public Helper: Group questions into block sizes for subset-sum validation and randomization
  async getTopicBlocks(topicId: string, tx: any = this.prisma): Promise<{ id: string; size: number; questionIds: string[] }[]> {
    const questions = await tx.question.findMany({
      where: { topicId },
      select: { id: true, previousQuestionId: true },
    });

    const nextMap = new Map<string, string>(); // prevQuestionId -> currentQuestionId
    const isNextSet = new Set<string>();       // set of currentQuestionIds that depend on something

    questions.forEach((q) => {
      if (q.previousQuestionId) {
        nextMap.set(q.previousQuestionId, q.id);
        isNextSet.add(q.id);
      }
    });

    // A question is the start of a chain if it does not depend on any previous question
    const starts = questions.filter((q) => !isNextSet.has(q.id));
    const blocks: { id: string; size: number; questionIds: string[] }[] = [];

    starts.forEach((startQ) => {
      const questionIds: string[] = [startQ.id];
      let curr = startQ.id;
      while (nextMap.has(curr)) {
        curr = nextMap.get(curr)!;
        questionIds.push(curr);
      }
      blocks.push({
        id: startQ.id,
        size: questionIds.length,
        questionIds,
      });
    });

    return blocks;
  }

  // Public Helper: Subset-sum solver (Knapsack)
  canFormSubsetSum(blocks: { size: number }[], target: number): boolean {
    if (target === 0) return true;
    if (target < 0) return false;

    const dp = new Array(target + 1).fill(false);
    dp[0] = true;

    for (const block of blocks) {
      for (let j = target; j >= block.size; j--) {
        if (dp[j - block.size]) {
          dp[j] = true;
        }
      }
    }

    return dp[target];
  }

  async upsertConfig(dto: CreateExamTopicConfigDto, user: User) {
    const exam = await this.prisma.exam.findUnique({ where: { id: dto.examId } });
    if (!exam) {
      throw new NotFoundException(`Exam with ID ${dto.examId} not found`);
    }

    if (user.role === Role.LECTURER && exam.createdById !== user.id) {
      throw new ForbiddenException('You can only configure exams you created');
    }

    // Check lock state
    await this.examService.checkExamLocked(dto.examId);

    // Verify Topic belongs to the Exam
    const topic = await this.prisma.topic.findUnique({ where: { id: dto.topicId } });
    if (!topic) {
      throw new NotFoundException(`Topic with ID ${dto.topicId} not found`);
    }
    if (topic.examId !== dto.examId) {
      throw new BadRequestException('This topic does not belong to the specified exam');
    }

    // Validate if the requested questionCount can be satisfied by the topic blocks
    const blocks = await this.getTopicBlocks(dto.topicId);
    const totalQuestionsAvailable = blocks.reduce((sum, b) => sum + b.size, 0);

    if (dto.questionCount > totalQuestionsAvailable) {
      throw new BadRequestException(
        `Topic "${topic.title}" only has ${totalQuestionsAvailable} questions, but ${dto.questionCount} were requested.`
      );
    }

    if (!this.canFormSubsetSum(blocks, dto.questionCount)) {
      throw new BadRequestException(
        `Requested count (${dto.questionCount}) cannot be satisfied exactly because of question dependency chains.`
      );
    }

    return this.prisma.examTopicConfig.upsert({
      where: {
        examId_topicId: {
          examId: dto.examId,
          topicId: dto.topicId,
        },
      },
      update: {
        questionCount: dto.questionCount,
      },
      create: {
        examId: dto.examId,
        topicId: dto.topicId,
        questionCount: dto.questionCount,
      },
      include: {
        topic: true,
      },
    });
  }

  async removeConfig(examId: string, topicId: string, user: User) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }

    if (user.role === Role.LECTURER && exam.createdById !== user.id) {
      throw new ForbiddenException('You can only modify configs for exams you created');
    }

    // Check lock state
    await this.examService.checkExamLocked(examId);

    const config = await this.prisma.examTopicConfig.findUnique({
      where: { examId_topicId: { examId, topicId } },
    });
    if (!config) {
      throw new NotFoundException('Topic configuration not found for this exam');
    }

    await this.prisma.examTopicConfig.delete({
      where: { examId_topicId: { examId, topicId } },
    });

    return { message: 'Topic configuration removed successfully' };
  }
}

import { Module } from '@nestjs/common';
import { ExamAttemptService } from './exam-attempt.service';
import { ExamAttemptController } from './exam-attempt.controller';
import { GradingService } from './grading.service';
import { ExamModule } from '../exam/exam.module';

@Module({
  imports: [ExamModule],
  controllers: [ExamAttemptController],
  providers: [ExamAttemptService, GradingService],
  exports: [ExamAttemptService, GradingService],
})
export class AttemptModule {}

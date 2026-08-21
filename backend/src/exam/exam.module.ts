import { Module } from '@nestjs/common';
import { ExamService } from './exam.service';
import { ExamController } from './exam.controller';
import { ExamTopicConfigService } from './exam-topic-config.service';
import { ExamTopicConfigController } from './exam-topic-config.controller';
import { ExamParticipantService } from './exam-participant.service';
import { ExamParticipantController } from './exam-participant.controller';

@Module({
  controllers: [
    ExamController,
    ExamTopicConfigController,
    ExamParticipantController,
  ],
  providers: [
    ExamService,
    ExamTopicConfigService,
    ExamParticipantService,
  ],
  exports: [
    ExamService,
    ExamTopicConfigService,
    ExamParticipantService,
  ],
})
export class ExamModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AcademicModule } from './academic/academic.module';
import { ExamModule } from './exam/exam.module';
import { TopicModule } from './topic/topic.module';
import { QuestionModule } from './question/question.module';
import { AttemptModule } from './attempt/attempt.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    AcademicModule,
    ExamModule,
    TopicModule,
    QuestionModule,
    AttemptModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

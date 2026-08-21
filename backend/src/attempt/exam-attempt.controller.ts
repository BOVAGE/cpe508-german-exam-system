import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ExamAttemptService } from './exam-attempt.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Student Exam Attempts')
@ApiBearerAuth('JWT-auth')
@Controller('exams/:examId/attempts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamAttemptController {
  constructor(private readonly attemptService: ExamAttemptService) {}

  @Post('start')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Initiate a new examination attempt, performing randomization (Student only)' })
  @ApiResponse({ status: 201, description: 'Exam attempt successfully created, pre-generated randomized question set returned' })
  @ApiResponse({ status: 400, description: 'Student already has attempt / invalid exam setup counts' })
  @ApiResponse({ status: 403, description: 'Student not eligible / exam window not open or expired' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  startAttempt(@Param('examId') examId: string, @CurrentUser() user: User) {
    return this.attemptService.startAttempt(examId, user);
  }

  @Get('state')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Retrieve the current active or graded attempt state for resumes / refreshes (Student only)' })
  @ApiResponse({ status: 200, description: 'Attempt state returned (including saved answers)' })
  @ApiResponse({ status: 404, description: 'No attempt found' })
  getAttemptState(@Param('examId') examId: string, @CurrentUser() user: User) {
    return this.attemptService.getAttemptState(examId, user);
  }

  @Post('answers')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Incrementally save a student answer for a single gap in a question (Student only)' })
  @ApiResponse({ status: 201, description: 'Answer saved' })
  @ApiResponse({ status: 400, description: 'Attempt not in progress / time expired (causes auto-submission)' })
  @ApiResponse({ status: 404, description: 'Attempt or gap config not found' })
  saveAnswer(
    @Param('examId') examId: string,
    @Body() submitAnswerDto: SubmitAnswerDto,
    @CurrentUser() user: User,
  ) {
    return this.attemptService.saveAnswer(examId, submitAnswerDto, user);
  }

  @Post('submit')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Finalize and submit the entire examination attempt, triggering the grading engine (Student only)' })
  @ApiResponse({ status: 201, description: 'Exam attempt finalized, graded, and score results returned' })
  @ApiResponse({ status: 400, description: 'Attempt not in progress' })
  @ApiResponse({ status: 404, description: 'Attempt not found' })
  submitAttempt(@Param('examId') examId: string, @CurrentUser() user: User) {
    return this.attemptService.submitAttempt(examId, user);
  }
}

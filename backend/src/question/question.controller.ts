import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { QuestionService } from './question.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Exams - Questions & Gaps')
@ApiBearerAuth('JWT-auth')
@Controller('questions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({
    summary:
      'Create a new fill-in-the-gap question with gaps and accepted answers atomically (Admin / Lecturer only)',
  })
  @ApiResponse({ status: 201, description: 'Question created' })
  @ApiResponse({
    status: 400,
    description:
      'Gap configuration mismatch / circular dependencies / inter-topic dependency mismatch / locks active',
  })
  @ApiResponse({
    status: 403,
    description: 'Unauthorized access to exam configuration',
  })
  @ApiResponse({
    status: 404,
    description: 'Topic or previous dependent question not found',
  })
  create(
    @Body() createQuestionDto: CreateQuestionDto,
    @CurrentUser() user: User,
  ) {
    return this.questionService.create(createQuestionDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get list of all questions under a topic' })
  @ApiQuery({ name: 'topicId', description: 'The ID (UUID) of the topic' })
  @ApiResponse({
    status: 200,
    description:
      'List of questions retrieved (correct answers are stripped if requester is STUDENT)',
  })
  @ApiResponse({ status: 403, description: 'Unauthorized to view questions' })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  findAll(@Query('topicId') topicId: string, @CurrentUser() user: User) {
    return this.questionService.findAll(topicId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specific question details' })
  @ApiResponse({
    status: 200,
    description:
      'Question details (correct answers are stripped if requester is STUDENT)',
  })
  @ApiResponse({ status: 403, description: 'Unauthorized to view question' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.questionService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({
    summary:
      'Update question text, dependency link, or replace gap configurations (Admin / Lecturer only)',
  })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Circular dependency / gap mismatch / locks active',
  })
  @ApiResponse({ status: 403, description: 'Unauthorized to edit question' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  update(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
    @CurrentUser() user: User,
  ) {
    return this.questionService.update(id, updateQuestionDto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Delete a question (Admin / Lecturer only)' })
  @ApiResponse({ status: 200, description: 'Question deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Question cannot be deleted because locks are active',
  })
  @ApiResponse({ status: 403, description: 'Unauthorized to delete question' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.questionService.remove(id, user);
  }
}

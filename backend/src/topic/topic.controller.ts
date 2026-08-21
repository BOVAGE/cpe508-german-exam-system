import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { TopicService } from './topic.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('Exams - Topics')
@ApiBearerAuth('JWT-auth')
@Controller('topics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TopicController {
  constructor(private readonly topicService: TopicService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Create a new topic under an exam (Admin / Lecturer creator only)' })
  @ApiResponse({ status: 201, description: 'Topic created successfully' })
  @ApiResponse({ status: 400, description: 'Topic title already exists in exam / locks active' })
  @ApiResponse({ status: 403, description: 'Unauthorized access to exam configuration' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  create(@Body() createTopicDto: CreateTopicDto, @CurrentUser() user: User) {
    return this.topicService.create(createTopicDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get list of all topics in an exam' })
  @ApiQuery({ name: 'examId', description: 'The ID (UUID) of the exam' })
  @ApiResponse({ status: 200, description: 'List of topics retrieved' })
  @ApiResponse({ status: 403, description: 'Unauthorized to view topics' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  findAll(@Query('examId') examId: string, @CurrentUser() user: User) {
    return this.topicService.findAll(examId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specific topic details with questions' })
  @ApiResponse({ status: 200, description: 'Topic details (correct answers are stripped if requester is STUDENT)' })
  @ApiResponse({ status: 403, description: 'Unauthorized to view topic' })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.topicService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Update topic details (Admin / Lecturer creator only)' })
  @ApiResponse({ status: 200, description: 'Topic updated successfully' })
  @ApiResponse({ status: 400, description: 'Topic title duplicate / locks active' })
  @ApiResponse({ status: 403, description: 'Unauthorized to edit topic' })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  update(
    @Param('id') id: string,
    @Body() updateTopicDto: UpdateTopicDto,
    @CurrentUser() user: User,
  ) {
    return this.topicService.update(id, updateTopicDto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Delete a topic (Admin / Lecturer creator only)' })
  @ApiResponse({ status: 200, description: 'Topic deleted successfully' })
  @ApiResponse({ status: 400, description: 'Topic cannot be deleted because locks are active' })
  @ApiResponse({ status: 403, description: 'Unauthorized to delete topic' })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.topicService.remove(id, user);
  }
}

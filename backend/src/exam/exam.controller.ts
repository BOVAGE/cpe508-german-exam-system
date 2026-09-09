import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
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
} from '@nestjs/swagger';

@ApiTags('Exams')
@ApiBearerAuth('JWT-auth')
@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Create a new examination (Admin / Lecturer only)' })
  @ApiResponse({ status: 201, description: 'Exam created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Start date is after end date / Validation error',
  })
  @ApiResponse({
    status: 403,
    description: 'Lecturer is not assigned to teach this course',
  })
  create(@Body() createExamDto: CreateExamDto, @CurrentUser() user: User) {
    return this.examService.create(createExamDto, user);
  }

  @Get()
  @ApiOperation({
    summary:
      'Get list of examinations based on role (Admin see all, Lecturer see assigned, Student see eligible)',
  })
  @ApiResponse({ status: 200, description: 'List of exams retrieved' })
  findAll(@CurrentUser() user: User) {
    return this.examService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get specific exam details (Admin, assigned Lecturer, or registered Student)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Exam details (correct answers are stripped if requester is STUDENT)',
  })
  @ApiResponse({ status: 403, description: 'Unauthorized to access this exam' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.examService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({
    summary:
      'Update exam configuration details (Admin / Lecturer creator only)',
  })
  @ApiResponse({ status: 200, description: 'Exam updated' })
  @ApiResponse({
    status: 400,
    description:
      'Exam locks are active due to started attempts / invalid status change',
  })
  @ApiResponse({ status: 403, description: 'Unauthorized to edit this exam' })
  update(
    @Param('id') id: string,
    @Body() updateExamDto: UpdateExamDto,
    @CurrentUser() user: User,
  ) {
    return this.examService.update(id, updateExamDto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({
    summary: 'Delete an examination (Admin / Lecturer creator only)',
  })
  @ApiResponse({ status: 200, description: 'Exam deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Exam cannot be deleted because student attempts exist',
  })
  @ApiResponse({ status: 403, description: 'Unauthorized to delete this exam' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.examService.remove(id, user);
  }
}

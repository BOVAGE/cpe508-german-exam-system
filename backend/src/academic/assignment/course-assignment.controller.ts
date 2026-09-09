import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CourseAssignmentService } from './course-assignment.service';
import { CreateCourseAssignmentDto } from './dto/create-assignment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Academic Structure - Course Assignments')
@ApiBearerAuth('JWT-auth')
@Controller('course-assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CourseAssignmentController {
  constructor(private readonly assignmentService: CourseAssignmentService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Assign a Lecturer to a Course for a session/academic year (Admin only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Course assignment created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Lecturer already assigned or user role mismatch',
  })
  @ApiResponse({ status: 404, description: 'Lecturer or Course not found' })
  create(@Body() createAssignmentDto: CreateCourseAssignmentDto) {
    return this.assignmentService.create(createAssignmentDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get list of all Course Assignments (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'List of course assignments retrieved',
  })
  findAll() {
    return this.assignmentService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get specific Course Assignment details (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Course assignment details' })
  @ApiResponse({ status: 404, description: 'Course assignment not found' })
  findOne(@Param('id') id: string) {
    return this.assignmentService.findOne(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove a Course Assignment (Admin only)' })
  @ApiResponse({ status: 200, description: 'Course assignment deleted' })
  @ApiResponse({ status: 404, description: 'Course assignment not found' })
  remove(@Param('id') id: string) {
    return this.assignmentService.remove(id);
  }
}

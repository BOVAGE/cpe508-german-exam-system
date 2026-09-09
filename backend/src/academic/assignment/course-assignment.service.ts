import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCourseAssignmentDto } from './dto/create-assignment.dto';
import { Role } from '@prisma/client';

@Injectable()
export class CourseAssignmentService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCourseAssignmentDto) {
    // 1. Verify lecturer exists and has LECTURER role
    const lecturer = await this.prisma.user.findUnique({
      where: { id: dto.lecturerId },
    });
    if (!lecturer) {
      throw new NotFoundException(`User with ID ${dto.lecturerId} not found`);
    }
    if (lecturer.role !== Role.LECTURER) {
      throw new BadRequestException(
        `User ${lecturer.firstName} ${lecturer.lastName} is not a lecturer (role is ${lecturer.role})`,
      );
    }

    // 2. Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${dto.courseId} not found`);
    }

    // 3. Verify uniqueness
    const existing = await this.prisma.courseAssignment.findUnique({
      where: {
        lecturerId_courseId_academicYear_session: {
          lecturerId: dto.lecturerId,
          courseId: dto.courseId,
          academicYear: dto.academicYear,
          session: dto.session,
        },
      },
    });
    if (existing) {
      throw new BadRequestException(
        'This lecturer is already assigned to this course for the specified academic year and session',
      );
    }

    return this.prisma.courseAssignment.create({
      data: dto,
      include: {
        lecturer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        course: true,
      },
    });
  }

  async findAll() {
    return this.prisma.courseAssignment.findMany({
      include: {
        lecturer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        course: true,
      },
    });
  }

  async findOne(id: string) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id },
      include: {
        lecturer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        course: true,
      },
    });
    if (!assignment) {
      throw new NotFoundException(`Course assignment with ID ${id} not found`);
    }
    return assignment;
  }

  async remove(id: string) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id },
    });
    if (!assignment) {
      throw new NotFoundException(`Course assignment with ID ${id} not found`);
    }
    await this.prisma.courseAssignment.delete({ where: { id } });
    return { message: 'Course assignment deleted successfully' };
  }
}

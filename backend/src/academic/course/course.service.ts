import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Role, User } from '@prisma/client';

@Injectable()
export class CourseService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCourseDto) {
    // Verify Department exists
    const dept = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!dept) {
      throw new NotFoundException(`Department with ID ${dto.departmentId} not found`);
    }

    // Verify unique code
    const existing = await this.prisma.course.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException(`Course with code ${dto.code} already exists`);
    }

    return this.prisma.course.create({
      data: dto,
    });
  }

  async findAll(user?: User) {
    const where: any = {};

    if (user && user.role === Role.LECTURER) {
      where.courseAssignments = {
        some: {
          lecturerId: user.id,
        },
      };
    }

    return this.prisma.course.findMany({
      where,
      include: {
        department: {
          include: { faculty: true },
        },
        courseAssignments: {
          include: {
            lecturer: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });
  }

  async findOne(id: string, user?: User) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        department: {
          include: { faculty: true },
        },
        courseAssignments: {
          include: {
            lecturer: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    if (user && user.role === Role.LECTURER) {
      const isAssigned = course.courseAssignments.some((ca) => ca.lecturerId === user.id);
      if (!isAssigned) {
        throw new ForbiddenException('You are not assigned to teach or manage this course');
      }
    }

    return course;
  }

  async update(id: string, dto: UpdateCourseDto) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
      if (!dept) {
        throw new NotFoundException(`Department with ID ${dto.departmentId} not found`);
      }
    }

    if (dto.code && dto.code !== course.code) {
      const existing = await this.prisma.course.findUnique({ where: { code: dto.code } });
      if (existing) {
        throw new BadRequestException(`Course with code ${dto.code} already exists`);
      }
    }

    return this.prisma.course.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }
    await this.prisma.course.delete({ where: { id } });
    return { message: 'Course deleted successfully' };
  }
}

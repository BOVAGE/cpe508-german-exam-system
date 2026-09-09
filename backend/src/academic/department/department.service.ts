import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDepartmentDto) {
    // Verify Faculty exists
    const faculty = await this.prisma.faculty.findUnique({
      where: { id: dto.facultyId },
    });
    if (!faculty) {
      throw new NotFoundException(`Faculty with ID ${dto.facultyId} not found`);
    }

    // Verify unique name or code
    const existing = await this.prisma.department.findFirst({
      where: {
        OR: [{ name: dto.name }, { code: dto.code }],
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Department with this name or code already exists',
      );
    }

    return this.prisma.department.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.department.findMany({
      include: {
        faculty: true,
        _count: {
          select: { courses: true, users: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        faculty: true,
        courses: true,
      },
    });
    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
    return department;
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });
    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    if (dto.facultyId) {
      const faculty = await this.prisma.faculty.findUnique({
        where: { id: dto.facultyId },
      });
      if (!faculty) {
        throw new NotFoundException(
          `Faculty with ID ${dto.facultyId} not found`,
        );
      }
    }

    if (dto.name && dto.name !== department.name) {
      const existing = await this.prisma.department.findUnique({
        where: { name: dto.name },
      });
      if (existing) {
        throw new BadRequestException(
          'Department with this name already exists',
        );
      }
    }

    if (dto.code && dto.code !== department.code) {
      const existing = await this.prisma.department.findUnique({
        where: { code: dto.code },
      });
      if (existing) {
        throw new BadRequestException(
          'Department with this code already exists',
        );
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });
    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
    await this.prisma.department.delete({ where: { id } });
    return { message: 'Department deleted successfully' };
  }
}

import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { UpdateFacultyDto } from './dto/update-faculty.dto';

@Injectable()
export class FacultyService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateFacultyDto) {
    const existing = await this.prisma.faculty.findFirst({
      where: {
        OR: [{ name: dto.name }, { code: dto.code }],
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Faculty with this name or code already exists',
      );
    }

    return this.prisma.faculty.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.faculty.findMany({
      include: {
        _count: {
          select: { departments: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const faculty = await this.prisma.faculty.findUnique({
      where: { id },
      include: {
        departments: true,
      },
    });
    if (!faculty) {
      throw new NotFoundException(`Faculty with ID ${id} not found`);
    }
    return faculty;
  }

  async update(id: string, dto: UpdateFacultyDto) {
    const faculty = await this.prisma.faculty.findUnique({ where: { id } });
    if (!faculty) {
      throw new NotFoundException(`Faculty with ID ${id} not found`);
    }

    if (dto.name && dto.name !== faculty.name) {
      const existing = await this.prisma.faculty.findUnique({
        where: { name: dto.name },
      });
      if (existing) {
        throw new BadRequestException('Faculty with this name already exists');
      }
    }

    if (dto.code && dto.code !== faculty.code) {
      const existing = await this.prisma.faculty.findUnique({
        where: { code: dto.code },
      });
      if (existing) {
        throw new BadRequestException('Faculty with this code already exists');
      }
    }

    return this.prisma.faculty.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const faculty = await this.prisma.faculty.findUnique({ where: { id } });
    if (!faculty) {
      throw new NotFoundException(`Faculty with ID ${id} not found`);
    }
    await this.prisma.faculty.delete({ where: { id } });
    return { message: 'Faculty deleted successfully' };
  }
}

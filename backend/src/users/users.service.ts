import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    // 1. Enforce student registration number constraints
    if (dto.role === Role.STUDENT && !dto.registrationNumber) {
      throw new BadRequestException('Students must have a registration number');
    }

    if (dto.role !== Role.STUDENT && dto.registrationNumber) {
      throw new BadRequestException(
        'Only students can have registration numbers',
      );
    }

    // 2. Validate uniqueness of email and registration number
    if (dto.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingUser) {
        throw new BadRequestException(
          `User with email ${dto.email} already exists`,
        );
      }
    }

    if (dto.registrationNumber) {
      const existingUser = await this.prisma.user.findUnique({
        where: { registrationNumber: dto.registrationNumber },
      });
      if (existingUser) {
        throw new BadRequestException(
          `Student with registration number ${dto.registrationNumber} already exists`,
        );
      }
    }

    // 3. Hash the password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 4. Create user record
    return this.prisma.user.create({
      data: {
        email: dto.email || null,
        registrationNumber: dto.registrationNumber || null,
        password: hashedPassword,
        role: dto.role,
        firstName: dto.firstName,
        lastName: dto.lastName,
        departmentId: dto.departmentId || null,
      },
      select: {
        id: true,
        email: true,
        registrationNumber: true,
        role: true,
        firstName: true,
        lastName: true,
        departmentId: true,
        firstTimeLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAll(role?: Role) {
    return this.prisma.user.findMany({
      where: role ? { role } : {},
      select: {
        id: true,
        email: true,
        registrationNumber: true,
        role: true,
        firstName: true,
        lastName: true,
        departmentId: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const { password, ...result } = user;
    return result;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByRegistrationNumber(registrationNumber: string) {
    return this.prisma.user.findUnique({
      where: { registrationNumber },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Uniqueness checks if updating
    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new BadRequestException('Email already in use');
      }
    }

    if (
      dto.registrationNumber &&
      dto.registrationNumber !== user.registrationNumber
    ) {
      const existing = await this.prisma.user.findUnique({
        where: { registrationNumber: dto.registrationNumber },
      });
      if (existing) {
        throw new BadRequestException('Registration number already in use');
      }
    }

    const data: any = { ...dto };
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        registrationNumber: true,
        role: true,
        firstName: true,
        lastName: true,
        departmentId: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }
}

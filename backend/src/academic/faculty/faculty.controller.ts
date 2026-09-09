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
import { FacultyService } from './faculty.service';
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { UpdateFacultyDto } from './dto/update-faculty.dto';
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

@ApiTags('Academic Structure - Faculties')
@ApiBearerAuth('JWT-auth')
@Controller('faculties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FacultyController {
  constructor(private readonly facultyService: FacultyService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new faculty (Admin only)' })
  @ApiResponse({ status: 201, description: 'Faculty created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Faculty code or name already exists',
  })
  create(@Body() createFacultyDto: CreateFacultyDto) {
    return this.facultyService.create(createFacultyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get list of all faculties (All Roles)' })
  @ApiResponse({ status: 200, description: 'List of faculties retrieved' })
  findAll() {
    return this.facultyService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get specific faculty with departments (All Roles)',
  })
  @ApiResponse({ status: 200, description: 'Faculty details' })
  @ApiResponse({ status: 404, description: 'Faculty not found' })
  findOne(@Param('id') id: string) {
    return this.facultyService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update faculty details (Admin only)' })
  @ApiResponse({ status: 200, description: 'Faculty updated' })
  @ApiResponse({ status: 404, description: 'Faculty not found' })
  update(@Param('id') id: string, @Body() updateFacultyDto: UpdateFacultyDto) {
    return this.facultyService.update(id, updateFacultyDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a faculty (Admin only)' })
  @ApiResponse({ status: 200, description: 'Faculty deleted' })
  @ApiResponse({ status: 404, description: 'Faculty not found' })
  remove(@Param('id') id: string) {
    return this.facultyService.remove(id);
  }
}

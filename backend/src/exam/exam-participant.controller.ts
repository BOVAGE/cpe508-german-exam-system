import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExamParticipantService } from './exam-participant.service';
import { CreateExamParticipantDto } from './dto/create-participant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Exams - Participants & Excel Imports')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamParticipantController {
  constructor(private readonly participantService: ExamParticipantService) {}

  @Post('exams/participants')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({
    summary:
      'Register an individual eligible student for an exam (Admin / Lecturer only)',
  })
  @ApiResponse({ status: 201, description: 'Student added to participants' })
  @ApiResponse({
    status: 400,
    description: 'Student already added / User is not a student',
  })
  @ApiResponse({ status: 404, description: 'Exam or Student user not found' })
  addParticipant(
    @Body() dto: CreateExamParticipantDto,
    @CurrentUser() user: User,
  ) {
    return this.participantService.addParticipant(dto, user);
  }

  @Get('exams/:examId/participants')
  @ApiOperation({
    summary: 'Get list of registered eligible student participants for an exam',
  })
  @ApiResponse({ status: 200, description: 'List of participants' })
  @ApiResponse({
    status: 403,
    description: 'Unauthorized access to exam details',
  })
  getParticipants(@Param('examId') examId: string, @CurrentUser() user: User) {
    return this.participantService.getParticipants(examId, user);
  }

  @Delete('exams/:examId/participants/:studentId')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({
    summary:
      'Remove a student from eligible exam participants (Admin / Lecturer only)',
  })
  @ApiResponse({ status: 200, description: 'Participant removed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Student has already started an attempt and cannot be removed',
  })
  @ApiResponse({ status: 404, description: 'Exam or Student not found' })
  removeParticipant(
    @Param('examId') examId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: User,
  ) {
    return this.participantService.removeParticipant(examId, studentId, user);
  }

  @Post('users/import-students')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Bulk import student user accounts via Excel sheet (Admin only)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel sheet containing student accounts',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Excel parsed. Import summary returned.',
  })
  @ApiResponse({
    status: 400,
    description: 'Missing required columns / No file uploaded',
  })
  importStudents(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException(
        'Please upload an Excel file (field name is "file")',
      );
    }
    return this.participantService.importStudentsExcel(file.buffer);
  }

  @Post('exams/:examId/import-participants')
  @Roles(Role.ADMIN, Role.LECTURER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Bulk register eligible student participants for an exam via Excel sheet (Admin / Lecturer only)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'Excel sheet containing registration numbers of eligible students',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Eligible students imported successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Some registration numbers do not exist as students (returned in error payload)',
  })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  importParticipants(
    @Param('examId') examId: string,
    @UploadedFile() file: any,
    @CurrentUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Please upload an Excel file (field name is "file")',
      );
    }
    return this.participantService.importParticipantsExcel(
      examId,
      file.buffer,
      user,
    );
  }

  @Get('exams/:examId/export-results')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({
    summary:
      'Export all exam participant results as a styled Excel sheet (Admin / Lecturer only)',
  })
  @ApiResponse({ status: 200, description: 'Excel file attachment stream' })
  @ApiResponse({ status: 403, description: 'Unauthorized to view results' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  async exportResults(
    @Param('examId') examId: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const buffer = await this.participantService.exportResultsExcel(
      examId,
      user,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=exam_results_${examId}.xlsx`,
    );
    res.send(buffer);
  }
}

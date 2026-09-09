import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamParticipantDto } from './dto/create-participant.dto';
import { ExamService } from './exam.service';
import { Role, User, AttemptStatus, ExamStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ExamParticipantService {
  constructor(
    private prisma: PrismaService,
    private examService: ExamService,
  ) {}

  async addParticipant(dto: CreateExamParticipantDto, user: User) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: dto.examId },
    });
    if (!exam) {
      throw new NotFoundException(`Exam with ID ${dto.examId} not found`);
    }

    if (user.role === Role.LECTURER && exam.createdById !== user.id) {
      throw new ForbiddenException(
        'You can only manage participants for exams you created',
      );
    }

    const student = await this.prisma.user.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) {
      throw new NotFoundException(
        `Student user with ID ${dto.studentId} not found`,
      );
    }
    if (student.role !== Role.STUDENT) {
      throw new BadRequestException('The selected user is not a student');
    }

    const existing = await this.prisma.examParticipant.findUnique({
      where: {
        examId_studentId: {
          examId: dto.examId,
          studentId: dto.studentId,
        },
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Student is already registered as an eligible participant for this exam',
      );
    }

    return this.prisma.examParticipant.create({
      data: dto,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationNumber: true,
          },
        },
      },
    });
  }

  async getParticipants(examId: string, user: User) {
    await this.examService.findOne(examId, user); // check access

    return this.prisma.examParticipant.findMany({
      where: { examId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationNumber: true,
            email: true,
          },
        },
      },
    });
  }

  async removeParticipant(examId: string, studentId: string, user: User) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }

    if (user.role === Role.LECTURER && exam.createdById !== user.id) {
      throw new ForbiddenException(
        'You can only manage participants for exams you created',
      );
    }

    const attempt = await this.prisma.examAttempt.findUnique({
      where: {
        examId_studentId: { examId, studentId },
      },
    });
    if (attempt) {
      throw new BadRequestException(
        'Cannot remove student from participants because they have already started an attempt',
      );
    }

    await this.prisma.examParticipant.delete({
      where: {
        examId_studentId: { examId, studentId },
      },
    });

    return { message: 'Participant removed successfully' };
  }

  // Admin: Excel student account import
  async importStudentsExcel(fileBuffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
      throw new BadRequestException(
        'Excel file must contain at least one worksheet',
      );
    }

    const rows: any[] = [];
    let headers: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      const values = (row.values as any[]).slice(1);
      if (rowNumber === 1) {
        headers = values.map((h) => String(h).trim().toLowerCase());
      } else {
        const rowData: any = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index];
        });
        rows.push({ rowNumber, data: rowData });
      }
    });

    const required = [
      'registration number',
      'first name',
      'last name',
      'email',
      'department code',
    ];
    for (const req of required) {
      if (!headers.includes(req)) {
        throw new BadRequestException(
          `Excel sheet is missing required column: "${req}"`,
        );
      }
    }

    const errors: string[] = [];
    let importedCount = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const { rowNumber, data } of rows) {
        const regNum = String(data['registration number'] || '').trim();
        const firstName = String(data['first name'] || '').trim();
        const lastName = String(data['last name'] || '').trim();
        const email = String(data['email'] || '')
          .trim()
          .toLowerCase();
        const deptCode = String(data['department code'] || '')
          .trim()
          .toUpperCase();

        if (!regNum || !firstName || !lastName || !email || !deptCode) {
          errors.push(`Row ${rowNumber}: All fields must be non-empty.`);
          continue;
        }

        const dept = await tx.department.findUnique({
          where: { code: deptCode },
        });
        if (!dept) {
          errors.push(
            `Row ${rowNumber}: Department code "${deptCode}" does not exist.`,
          );
          continue;
        }

        const existingReg = await tx.user.findUnique({
          where: { registrationNumber: regNum },
        });
        if (existingReg) {
          errors.push(
            `Row ${rowNumber}: Registration number "${regNum}" is already registered.`,
          );
          continue;
        }

        const existingEmail = await tx.user.findUnique({ where: { email } });
        if (existingEmail) {
          errors.push(
            `Row ${rowNumber}: Email "${email}" is already registered.`,
          );
          continue;
        }

        const defaultPassword = lastName.toLowerCase();
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        await tx.user.create({
          data: {
            registrationNumber: regNum,
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role: Role.STUDENT,
            departmentId: dept.id,
          },
        });

        importedCount++;
      }
    });

    return {
      success: errors.length === 0,
      importedCount,
      errors,
    };
  }

  // Lecturer: Excel exam participant import
  async importParticipantsExcel(
    examId: string,
    fileBuffer: Buffer,
    user: User,
  ) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }

    if (user.role === Role.LECTURER && exam.createdById !== user.id) {
      throw new ForbiddenException(
        'You can only import participants for exams you created',
      );
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new BadRequestException(
        'Excel file must contain at least one worksheet',
      );
    }

    let headers: string[] = [];
    const registrationNumbers: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      const values = (row.values as any[]).slice(1);
      if (rowNumber === 1) {
        headers = values.map((h) => String(h).trim().toLowerCase());
      } else {
        const regNumIdx = headers.indexOf('registration number');
        if (regNumIdx !== -1 && values[regNumIdx]) {
          registrationNumbers.push(String(values[regNumIdx]).trim());
        }
      }
    });

    if (!headers.includes('registration number')) {
      throw new BadRequestException(
        'Excel sheet is missing required column: "registration number"',
      );
    }

    const uniqueRegNumsInExcel = Array.from(new Set(registrationNumbers));

    if (uniqueRegNumsInExcel.length === 0) {
      throw new BadRequestException(
        'No student registration numbers found in the Excel file',
      );
    }

    const unmatched: string[] = [];
    const validStudentIds: string[] = [];

    for (const regNum of uniqueRegNumsInExcel) {
      const student = await this.prisma.user.findFirst({
        where: {
          registrationNumber: regNum,
          role: Role.STUDENT,
        },
      });

      if (!student) {
        unmatched.push(regNum);
      } else {
        validStudentIds.push(student.id);
      }
    }

    if (unmatched.length > 0) {
      throw new BadRequestException({
        message:
          'Import rejected because some registration numbers do not exist as students in the system.',
        unmatchedCount: unmatched.length,
        unmatchedRecords: unmatched,
      });
    }

    let importedCount = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const studentId of validStudentIds) {
        const exists = await tx.examParticipant.findUnique({
          where: {
            examId_studentId: { examId, studentId },
          },
        });

        if (!exists) {
          await tx.examParticipant.create({
            data: {
              examId,
              studentId,
            },
          });
          importedCount++;
        }
      }
    });

    return {
      message: 'Excel import completed successfully',
      importedCount,
    };
  }

  // Lecturer: Export Exam Results as a styled Excel workbook
  async exportResultsExcel(examId: string, user: User): Promise<Buffer> {
    // 1. Fetch Exam & check permissions
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        course: true,
        topicConfigs: {
          include: {
            topic: {
              include: {
                questions: {
                  include: { gaps: true },
                },
              },
            },
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }

    if (user.role === Role.LECTURER && exam.createdById !== user.id) {
      throw new ForbiddenException(
        'You can only export results for exams you created',
      );
    }

    // Compute default maximum exam points from config (used for NOT_ATTEMPTED students)
    let defaultMaxPoints = 0;
    exam.topicConfigs.forEach((config) => {
      // Find all gaps in this topic
      const gaps = config.topic.questions.flatMap((q) => q.gaps);
      // Average points per gap
      const avgGapPoints =
        gaps.reduce((sum, g) => sum + g.points, 0) / (gaps.length || 1);
      // Estimate max points = config questionCount * avgGapPoints * average gaps per question
      // To be clean, if questions are uniform, we estimate.
      // But a better approach is to sum points of the first K questions in topic blocks.
      // Let's use a simpler heuristic: sum points of K questions in the topic.
      const sortedQuestions = [...config.topic.questions].sort((a, b) => {
        const aGapsPoints = a.gaps.reduce((s, g) => s + g.points, 0);
        const bGapsPoints = b.gaps.reduce((s, g) => s + g.points, 0);
        return bGapsPoints - aGapsPoints; // sort descending to show max possible points safely
      });
      const topK = sortedQuestions.slice(0, config.questionCount);
      const topKPoints = topK.reduce(
        (sum, q) => sum + q.gaps.reduce((s, g) => s + g.points, 0),
        0,
      );
      defaultMaxPoints += topKPoints;
    });

    // 2. Fetch all participants with their attempts (left join)
    const participants = await this.prisma.examParticipant.findMany({
      where: { examId },
      include: {
        student: {
          include: {
            department: true,
            attempts: {
              where: { examId },
              include: {
                questions: {
                  include: {
                    question: {
                      include: { gaps: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        student: {
          registrationNumber: 'asc',
        },
      },
    });

    // 3. Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Results Summary');

    // Enable gridlines
    worksheet.views = [{ showGridLines: true }];

    // Title Row
    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `${exam.course.code} - ${exam.title} (${exam.academicYear} ${exam.session} Session)`;
    titleCell.font = {
      name: 'Arial',
      size: 16,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E78' }, // Dark Blue
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 40;

    // Header Row
    const headers = [
      'Student Name',
      'Registration Number',
      'Department',
      'Score Obtained',
      'Max Possible Score',
      'Percentage',
      'Submission Time',
      'Examination Status',
    ];
    worksheet.addRow(headers);

    const headerRow = worksheet.getRow(2);
    headerRow.height = 25;

    // Style Header Cells
    headerRow.eachCell((cell) => {
      cell.font = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2F5597' }, // Steel Blue
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      };
    });

    // Add Data Rows
    participants.forEach((p) => {
      const student = p.student;
      const studentName = `${student.lastName}, ${student.firstName}`;
      const regNum = student.registrationNumber || 'N/A';
      const deptName = student.department ? student.department.name : 'N/A';

      const attempt = student.attempts.length > 0 ? student.attempts[0] : null;

      let score = 0.0;
      let maxScore = defaultMaxPoints;
      let percentage = 0.0;
      let submissionTimeStr = 'N/A';
      let status = 'NOT_ATTEMPTED';

      if (attempt) {
        score = attempt.score;
        // Exact max possible score for their specific generated question set
        maxScore = attempt.questions.reduce((sum, aq) => {
          return sum + aq.question.gaps.reduce((s, g) => s + g.points, 0);
        }, 0);
        percentage = attempt.percentage / 100; // stored in db as 0-100, we divide by 100 for Excel format percentage
        submissionTimeStr = attempt.submittedAt
          ? attempt.submittedAt.toLocaleString()
          : 'In Progress';
        status = attempt.status;
      }

      worksheet.addRow([
        studentName,
        regNum,
        deptName,
        attempt ? score : 0.0,
        maxScore,
        attempt ? percentage : 0.0,
        submissionTimeStr,
        status,
      ]);
    });

    // Style Data Rows
    for (let i = 3; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      row.height = 20;

      // Zebra striping
      const isEven = i % 2 === 0;
      const bgArgb = isEven ? 'F2F2F2' : 'FFFFFF';

      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: `FF${bgArgb}` },
        };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        };

        // Alignments and formatting
        if (colNumber === 2 || colNumber === 7 || colNumber === 8) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 4 || colNumber === 5 || colNumber === 6) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }

        // Apply number format to percentage
        if (colNumber === 6) {
          cell.numFmt = '0.0%';
        }
        // Format score decimal
        if (colNumber === 4 || colNumber === 5) {
          cell.numFmt = '0.0';
        }
      });
    }

    // Set Column Widths
    worksheet.columns.forEach((column) => {
      let maxLen = 0;
      column.eachCell!({ includeEmpty: true }, (cell) => {
        const valLen = cell.value ? String(cell.value).length : 0;
        if (valLen > maxLen) {
          maxLen = valLen;
        }
      });
      column.width = Math.max(maxLen + 4, 12);
    });

    const buffer = Buffer.from((await workbook.xlsx.writeBuffer()) as any);
    return buffer;
  }
}

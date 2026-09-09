import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ExamTopicConfigService } from './exam-topic-config.service';
import { CreateExamTopicConfigDto } from './dto/create-topic-config.dto';
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

@ApiTags('Exams - Topic Distribution Configs')
@ApiBearerAuth('JWT-auth')
@Controller('exams/topic-configs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamTopicConfigController {
  constructor(private readonly configService: ExamTopicConfigService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({
    summary:
      'Setup or update question count distribution for a topic in an exam (Admin / Lecturer only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Configuration upserted successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Question count cannot be satisfied due to dependency chains / locks active',
  })
  @ApiResponse({ status: 404, description: 'Exam or Topic not found' })
  upsertConfig(
    @Body() dto: CreateExamTopicConfigDto,
    @CurrentUser() user: User,
  ) {
    return this.configService.upsertConfig(dto, user);
  }

  @Delete(':examId/:topicId')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({
    summary:
      'Remove question count distribution for a topic in an exam (Admin / Lecturer only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Config cannot be deleted because locks are active',
  })
  @ApiResponse({ status: 404, description: 'Config not found' })
  removeConfig(
    @Param('examId') examId: string,
    @Param('topicId') topicId: string,
    @CurrentUser() user: User,
  ) {
    return this.configService.removeConfig(examId, topicId, user);
  }
}

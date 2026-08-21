import { Module } from '@nestjs/common';
import { FacultyService } from './faculty/faculty.service';
import { FacultyController } from './faculty/faculty.controller';
import { DepartmentService } from './department/department.service';
import { DepartmentController } from './department/department.controller';
import { CourseService } from './course/course.service';
import { CourseController } from './course/course.controller';
import { CourseAssignmentService } from './assignment/course-assignment.service';
import { CourseAssignmentController } from './assignment/course-assignment.controller';

@Module({
  controllers: [
    FacultyController,
    DepartmentController,
    CourseController,
    CourseAssignmentController,
  ],
  providers: [
    FacultyService,
    DepartmentService,
    CourseService,
    CourseAssignmentService,
  ],
  exports: [
    FacultyService,
    DepartmentService,
    CourseService,
    CourseAssignmentService,
  ],
})
export class AcademicModule {}

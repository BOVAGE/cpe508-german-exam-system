import { Test, TestingModule } from '@nestjs/testing';
import { ExamTopicConfigService } from './exam-topic-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExamService } from './exam.service';

describe('ExamTopicConfigService - Subset Sum Solver', () => {
  let service: ExamTopicConfigService;

  beforeEach(async () => {
    // Create a mock PrismaService and ExamService
    const mockPrismaService = {};
    const mockExamService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamTopicConfigService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ExamService, useValue: mockExamService },
      ],
    }).compile();

    service = module.get<ExamTopicConfigService>(ExamTopicConfigService);
  });

  describe('canFormSubsetSum', () => {
    it('should return true for target 0', () => {
      expect(service.canFormSubsetSum([], 0)).toBe(true);
    });

    it('should return false for negative targets', () => {
      expect(service.canFormSubsetSum([{ size: 2 }], -1)).toBe(false);
    });

    it('should return true if single block size matches target', () => {
      const blocks = [{ size: 3 }];
      expect(service.canFormSubsetSum(blocks, 3)).toBe(true);
      expect(service.canFormSubsetSum(blocks, 2)).toBe(false);
    });

    it('should solve subset sum correctly for multiple blocks', () => {
      // Blocks sizes: 3, 2, 1
      const blocks = [{ size: 3 }, { size: 2 }, { size: 1 }];

      expect(service.canFormSubsetSum(blocks, 5)).toBe(true);  // 3 + 2
      expect(service.canFormSubsetSum(blocks, 4)).toBe(true);  // 3 + 1
      expect(service.canFormSubsetSum(blocks, 6)).toBe(true);  // 3 + 2 + 1
      expect(service.canFormSubsetSum(blocks, 0)).toBe(true);  // empty set
      expect(service.canFormSubsetSum(blocks, 7)).toBe(false); // exceeds total
    });

    it('should handle impossible combinations (indivisible chains)', () => {
      // Topic has chains of size 3 and 3
      const blocks = [{ size: 3 }, { size: 3 }];

      expect(service.canFormSubsetSum(blocks, 3)).toBe(true);  // 1 chain of 3
      expect(service.canFormSubsetSum(blocks, 6)).toBe(true);  // both chains (6)
      expect(service.canFormSubsetSum(blocks, 5)).toBe(false); // impossible to form 5
      expect(service.canFormSubsetSum(blocks, 4)).toBe(false); // impossible to form 4
      expect(service.canFormSubsetSum(blocks, 2)).toBe(false); // impossible to form 2
    });

    it('should handle combination with multiple size-1 and size-N blocks', () => {
      const blocks = [
        { size: 4 }, // Chain Q1->Q2->Q3->Q4
        { size: 2 }, // Chain Q5->Q6
        { size: 1 }, // Independent Q7
        { size: 1 }, // Independent Q8
      ];

      expect(service.canFormSubsetSum(blocks, 5)).toBe(true);  // 4 + 1
      expect(service.canFormSubsetSum(blocks, 3)).toBe(true);  // 2 + 1
      expect(service.canFormSubsetSum(blocks, 7)).toBe(true);  // 4 + 2 + 1
      expect(service.canFormSubsetSum(blocks, 6)).toBe(true);  // 4 + 2
      expect(service.canFormSubsetSum(blocks, 8)).toBe(true);  // all of them
      expect(service.canFormSubsetSum(blocks, 9)).toBe(false); // impossible
    });
  });
});

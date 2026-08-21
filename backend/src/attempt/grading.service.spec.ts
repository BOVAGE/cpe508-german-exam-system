import { Test, TestingModule } from '@nestjs/testing';
import { GradingService } from './grading.service';
import { GradingMode } from '@prisma/client';

describe('GradingService', () => {
  let service: GradingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GradingService],
    }).compile();

    service = module.get<GradingService>(GradingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('STRICT mode', () => {
    const mode = GradingMode.STRICT;

    it('should match exact answers', () => {
      expect(service.isAnswerCorrect('Python', ['Python'], mode)).toBe(true);
    });

    it('should trim whitespace but require exact case', () => {
      expect(service.isAnswerCorrect('  Python  ', ['Python'], mode)).toBe(true);
      expect(service.isAnswerCorrect('python', ['Python'], mode)).toBe(false);
    });

    it('should match any accepted answer in the list', () => {
      expect(service.isAnswerCorrect('CPU', ['ALU', 'CPU', 'Register'], mode)).toBe(true);
    });

    it('should fail for slight spelling mistakes', () => {
      expect(service.isAnswerCorrect('Pythn', ['Python'], mode)).toBe(false);
    });
  });

  describe('NON_STRICT mode', () => {
    const mode = GradingMode.NON_STRICT;

    it('should match case-insensitively', () => {
      expect(service.isAnswerCorrect('python', ['Python'], mode)).toBe(true);
      expect(service.isAnswerCorrect('PYTHON', ['python'], mode)).toBe(true);
    });

    it('should tolerate minor spelling errors based on word length', () => {
      // 1. Short answers (< 4 chars): exact match only, no tolerance
      expect(service.isAnswerCorrect('cp', ['cpu'], mode)).toBe(false);
      expect(service.isAnswerCorrect('cpu', ['cpu'], mode)).toBe(true);

      // 2. Medium answers (4 to 7 chars): 1 char tolerance
      // "python" is length 6, "pythn" has dist 1 (missing o) -> Match!
      expect(service.isAnswerCorrect('pythn', ['Python'], mode)).toBe(true);
      // "pythnn" has dist 1 (extra n) -> Match!
      expect(service.isAnswerCorrect('pythnn', ['Python'], mode)).toBe(true);
      // "pytn" has dist 2 -> Fail!
      expect(service.isAnswerCorrect('pytn', ['Python'], mode)).toBe(false);

      // 3. Long answers (>= 8 chars): 2 char tolerance
      // "microprocessor" is length 14
      // "microprocesor" has dist 1 (missing s) -> Match!
      expect(service.isAnswerCorrect('microprocesor', ['microprocessor'], mode)).toBe(true);
      // "microprocsor" has dist 2 (missing e and s) -> Match!
      expect(service.isAnswerCorrect('microprocsor', ['microprocessor'], mode)).toBe(true);
      // "microprocor" has dist 3 -> Fail!
      expect(service.isAnswerCorrect('microprocor', ['microprocessor'], mode)).toBe(false);
    });
  });
});

import { Injectable } from '@nestjs/common';
import { GradingMode } from '@prisma/client';

@Injectable()
export class GradingService {
  // Wagner-Fischer Levenshtein distance algorithm
  private getLevenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            Math.min(
              matrix[i][j - 1] + 1,   // insertion
              matrix[i - 1][j] + 1,   // deletion
            ),
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  // Check if student answer matches any accepted answer
  isAnswerCorrect(studentAns: string, acceptedAnswers: string[], mode: GradingMode): boolean {
    if (acceptedAnswers.length === 0) return false;

    if (mode === GradingMode.STRICT) {
      const studentClean = studentAns.trim();
      return acceptedAnswers.some((acceptedAns) => studentClean === acceptedAns.trim());
    }

    // NON_STRICT Mode: lowercased, trimmed, spelling tolerance
    const s = studentAns.trim().toLowerCase();
    
    return acceptedAnswers.some((acceptedAns) => {
      const a = acceptedAns.trim().toLowerCase();
      if (s === a) return true;

      // Distance calculation
      const dist = this.getLevenshteinDistance(s, a);
      const len = a.length;
      
      // Spelling tolerance heuristic
      if (len < 4) {
        return dist === 0; // No tolerance for short words
      } else if (len >= 4 && len <= 7) {
        return dist <= 1;   // 1 char tolerance
      } else {
        return dist <= 2;   // 2 char tolerance
      }
    });
  }
}

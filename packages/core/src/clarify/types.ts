// SPDX-License-Identifier: Apache-2.0

export interface ClarifyOption {
  label: string;
  recommended?: boolean;
}

export interface ClarifyQuestion {
  id: string;
  question: string;
  options: ClarifyOption[];
}

export interface ClarifyAnswer {
  questionId: string;
  question: string;
  answer: string;
  custom: boolean;
}

export interface VaguenessAssessment {
  vague: boolean;
  reasons: string[];
}

export interface ClarifySession {
  originalTask: string;
  questions: ClarifyQuestion[];
  answers: ClarifyAnswer[];
  refinedTask: string;
}

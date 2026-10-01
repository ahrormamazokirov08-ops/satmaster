export interface SATWord {
  id: string;
  word: string;
  phonetic: string;
  pos: string;
  difficulty: 'High Frequency' | 'Medium' | 'Advanced';
  definition: string;
  sentence: string;
  synonyms: string;
}

export interface VocabProgress {
  masteredIds: string[];
  quizHighScore: number;
}

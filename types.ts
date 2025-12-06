export enum Language {
  ENGLISH = 'English',
  HINDI = 'Hindi',
  URDU = 'Urdu',
  BENGALI = 'Bengali',
  MARATHI = 'Marathi',
  TAMIL = 'Tamil',
  TELUGU = 'Telugu',
  GUJARATI = 'Gujarati',
  KANNADA = 'KannADA',
  MALAYALAM = 'Malayalam',
}

export enum WritingStyle {
  STORY = 'Story style',
  NOVEL = 'Novel style',
  MOTIVATIONAL = 'Motivational style',
  SELF_HELP = 'Self-help style',
  EMOTIONAL_LIFE_BASED_REAL_STORY = 'Emotional life-based real story',
}

export enum PageSize {
  A4 = 'A4',
  SIX_BY_NINE = '6x9 KDP Standard',
  FIVE_BY_EIGHT = '5x8 KDP Standard',
}

export interface BookSettings {
  topic: string;
  bookTitle: string;
  authorName: string;
  language: Language;
  writingStyle: WritingStyle;
  numChapters: number;
  minWordsPerChapter: number;
  pageSize: PageSize;
  includeCopyrightPage: boolean;
  includeDisclaimerPage: boolean;
  addAshvoraLabel: boolean;
  autoTableOfContents: boolean;
}

export interface Chapter {
  id: number;
  title: string;
  content: string;
}

export interface GeneratedBook {
  title: string;
  authorName: string;
  language: Language;
  topic: string;
  writingStyle: WritingStyle;
  copyrightPage: string | null;
  disclaimerPage: string | null;
  authorIntroduction: string;
  tableOfContents: Chapter[];
  chapters: Chapter[];
  endingPage: string;
  fullContentMarkdown: string; // The full book content in Markdown
}

export interface BookGenerationProgress {
  status: string;
  currentChapter: number;
  totalChapters: number;
  isGenerating: boolean;
  errorMessage: string | null;
  generatedSampleChapter: Chapter | null;
}

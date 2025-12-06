import { Language, WritingStyle, PageSize, BookSettings } from './types';

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: Language.ENGLISH, label: 'English' },
  { value: Language.HINDI, label: 'Hindi' },
  { value: Language.URDU, label: 'Urdu' },
  { value: Language.BENGALI, label: 'Bengali' },
  { value: Language.MARATHI, label: 'Marathi' },
  { value: Language.TAMIL, label: 'Tamil' },
  { value: Language.TELUGU, label: 'Telugu' },
  { value: Language.GUJARATI, label: 'Gujarati' },
  { value: Language.KANNADA, label: 'Kannada' },
  { value: Language.MALAYALAM, label: 'Malayalam' },
];

export const WRITING_STYLES: { value: WritingStyle; label: string }[] = [
  { value: WritingStyle.STORY, label: 'Story style' },
  { value: WritingStyle.NOVEL, label: 'Novel style' },
  { value: WritingStyle.MOTIVATIONAL, label: 'Motivational style' },
  { value: WritingStyle.SELF_HELP, label: 'Self-help style' },
  { value: WritingStyle.EMOTIONAL_LIFE_BASED_REAL_STORY, label: 'Emotional life-based real story' },
];

export const PAGE_SIZES: { value: PageSize; label: string }[] = [
  { value: PageSize.A4, label: 'A4' },
  { value: PageSize.SIX_BY_NINE, label: '6x9 KDP Standard' },
  { value: PageSize.FIVE_BY_EIGHT, label: '5x8 KDP Standard' },
];

export const DEFAULT_BOOK_SETTINGS: BookSettings = {
  topic: '',
  bookTitle: '',
  authorName: '',
  language: Language.ENGLISH,
  writingStyle: WritingStyle.EMOTIONAL_LIFE_BASED_REAL_STORY,
  numChapters: 30,
  minWordsPerChapter: 3000,
  pageSize: PageSize.SIX_BY_NINE,
  includeCopyrightPage: true,
  includeDisclaimerPage: true,
  addAshvoraLabel: true,
  autoTableOfContents: true,
};

export const ASHVORA_LABEL = 'Book made by ASHVORA\nAuto-generated for educational, creative & publishing purposes.';
export const ASHVORA_ENDING_LINE = 'Book made by ASHVORA';

export const COPYRIGHT_PAGE_TEMPLATE = (authorName: string) => `
**All rights reserved.**

No part of this book may be reproduced without permission.

Author: ${authorName}

Generated using ASHVORA Book Engine.
`;

export const DISCLAIMER_PAGE_CONTENT = `
**Disclaimer:**
This book contains thoughts, experiences, and examples intended solely for informational, educational, and inspirational purposes. The content reflects the author’s personal views, understanding, and interpretation of life, emotions, relationships, psychology, and human behavior. It should not be considered as professional advice.

All characters, situations, and case studies mentioned in this book are either fictitious or used for illustrative purposes only. Any resemblance to real persons, living or dead, or real events is purely coincidental. Readers are encouraged to use their own judgment before making any decisions based on the content of this book.

The author is not responsible for any direct or indirect consequences, emotional reactions, decisions, or actions taken by readers after reading this material. The information presented here may change with time, and no guarantees are made regarding completeness, accuracy, or reliability.

This book and its content are protected by copyright laws. No part of this publication may be reproduced, distributed, or used in any form without the prior written permission of the author.

This book is created and compiled by ASHVORA
`;

export const PAGES_PER_WORD_ESTIMATE_6X9 = 0.0003; // Rough estimate: 3000 words per 6x9 page

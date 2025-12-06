import { BookSettings, GeneratedBook, BookGenerationProgress, Chapter } from '../types';
import { COPYRIGHT_PAGE_TEMPLATE, DISCLAIMER_PAGE_CONTENT, ASHVORA_ENDING_LINE } from '../constants';
import * as geminiService from './geminiService';

interface GenerateBookResult {
  book: GeneratedBook;
  progress: BookGenerationProgress;
}

/**
 * Generates a full book based on the provided settings.
 * Updates a progress callback during the generation process.
 */
export async function generateFullBook(
  settings: BookSettings,
  onProgressUpdate: (progress: BookGenerationProgress) => void,
  abortSignal: AbortSignal,
): Promise<GenerateBookResult> {
  const initialProgress: BookGenerationProgress = {
    status: 'Initializing...',
    currentChapter: 0,
    totalChapters: settings.numChapters,
    isGenerating: true,
    errorMessage: null,
    generatedSampleChapter: null,
  };
  onProgressUpdate(initialProgress);

  try {
    // 1. Generate Book Title (if not provided)
    let finalBookTitle = settings.bookTitle;
    if (!finalBookTitle) {
      onProgressUpdate({ ...initialProgress, status: 'Generating book title...' });
      finalBookTitle = await geminiService.generateBookTitle(settings.topic, settings.language);
      if (abortSignal.aborted) throw new Error('Generation aborted');
    }

    // 2. Generate Author Introduction
    onProgressUpdate({ ...initialProgress, status: 'Generating author introduction...' });
    const authorIntroduction = await geminiService.generateAuthorIntroduction(
      settings.authorName,
      finalBookTitle,
      settings.topic,
      settings.writingStyle,
      settings.language
    );
    if (abortSignal.aborted) throw new Error('Generation aborted');

    // 3. Generate Table of Contents
    let tableOfContents: Chapter[] = [];
    if (settings.autoTableOfContents) {
      onProgressUpdate({ ...initialProgress, status: 'Generating table of contents...' });
      tableOfContents = await geminiService.generateTableOfContents(
        finalBookTitle,
        settings.topic,
        settings.writingStyle,
        settings.numChapters,
        settings.language
      );
      if (abortSignal.aborted) throw new Error('Generation aborted');

      if (tableOfContents.length !== settings.numChapters) {
        console.warn(`Generated ${tableOfContents.length} chapters, expected ${settings.numChapters}. Adjusting chapter count.`);
        // Adjust numChapters if TOC generation yields a different number
        settings.numChapters = tableOfContents.length;
        onProgressUpdate({ ...initialProgress, totalChapters: tableOfContents.length });
      }
    } else {
      // If no auto TOC, create placeholder chapter titles
      tableOfContents = Array.from({ length: settings.numChapters }, (_, i) => ({
        id: i + 1,
        title: `Chapter ${i + 1}`, // Generic title, user can edit in DOCX
        content: '',
      }));
    }

    // 4. Generate Chapters
    const generatedChapters: Chapter[] = [];
    let previousChapterSummaries: string[] = []; // Store summaries for continuity

    for (let i = 0; i < settings.numChapters; i++) {
      if (abortSignal.aborted) throw new Error('Generation aborted');

      const chapterNumber = i + 1;
      const chapterTitle = tableOfContents[i]?.title || `Chapter ${chapterNumber}`; // Use TOC title or generic

      onProgressUpdate({
        ...initialProgress,
        status: `Generating chapter ${chapterNumber} of ${settings.numChapters}: "${chapterTitle}"`,
        currentChapter: chapterNumber,
      });

      // Pass previous chapter content/summaries for continuity
      const previousContext = previousChapterSummaries.join('\n\n');

      const chapterContent = await geminiService.generateChapterContent(
        finalBookTitle,
        settings.topic,
        settings.writingStyle,
        settings.language,
        chapterNumber,
        chapterTitle,
        settings.minWordsPerChapter,
        previousContext
      );

      generatedChapters.push({ id: chapterNumber, title: chapterTitle, content: chapterContent });

      // Add a summary of the current chapter to the context for the next chapter
      // To avoid sending too much text for continuity, generate a brief summary
      if (chapterContent.length > 500) { // Only summarize if content is substantial
        const summaryPrompt = `Summarize the following chapter content in 100 words or less, focusing on key events and themes for continuity: ${chapterContent.substring(0, 1500)}...`;
        const ai = geminiService.getGeminiClient();
        const summaryResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash', // Use a faster model for summary generation
          contents: [{ parts: [{ text: summaryPrompt }] }],
          config: { maxOutputTokens: 150 },
        });
        previousChapterSummaries.push(`Chapter ${chapterNumber} summary: ${summaryResponse.text?.trim()}`);
        if (previousChapterSummaries.length > 5) { // Keep only last few summaries to avoid prompt bloat
          previousChapterSummaries.shift();
        }
      } else {
        previousChapterSummaries.push(`Chapter ${chapterNumber} content snippet: ${chapterContent.substring(0, Math.min(chapterContent.length, 300))}`);
      }
    }

    // 5. Generate Ending Page
    onProgressUpdate({ ...initialProgress, status: 'Generating ending page...', currentChapter: settings.numChapters });
    const endingPage = await geminiService.generateEndingPage(
      finalBookTitle,
      settings.authorName,
      settings.language
    );
    if (abortSignal.aborted) throw new Error('Generation aborted');

    // 6. Assemble the full book Markdown content
    let fullContentMarkdown = '';
    fullContentMarkdown += `# ${finalBookTitle}\n\n`;
    fullContentMarkdown += `## By ${settings.authorName}\n\n`;
    fullContentMarkdown += `\n\n`; // Spacer

    if (settings.includeCopyrightPage) {
      fullContentMarkdown += `---START_COPYRIGHT_PAGE---\n${COPYRIGHT_PAGE_TEMPLATE(settings.authorName)}\n---END_COPYRIGHT_PAGE---\n\n`;
    }
    if (settings.includeDisclaimerPage) {
      fullContentMarkdown += `---START_DISCLAIMER_PAGE---\n${DISCLAIMER_PAGE_CONTENT}\n---END_DISCLAIMER_PAGE---\n\n`;
    }
    fullContentMarkdown += `---START_AUTHOR_INTRODUCTION---\n## About the Author\n\n${authorIntroduction}\n---END_AUTHOR_INTRODUCTION---\n\n`;

    if (settings.autoTableOfContents && tableOfContents.length > 0) {
      fullContentMarkdown += `---START_TABLE_OF_CONTENTS---\n## Table of Contents\n\n`;
      tableOfContents.forEach(c => {
        fullContentMarkdown += `* Chapter ${c.id}: ${c.title}\n`;
      });
      fullContentMarkdown += `---END_TABLE_OF_CONTENTS---\n\n`;
    }

    generatedChapters.forEach(chapter => {
      fullContentMarkdown += `---START_CHAPTER_${chapter.id}---\n# Chapter ${chapter.id}: ${chapter.title}\n\n${chapter.content}\n---END_CHAPTER_${chapter.id}---\n\n`;
    });

    fullContentMarkdown += `---START_ENDING_PAGE---\n## Thank You\n\n${endingPage}\n---END_ENDING_PAGE---\n\n`;
    if (settings.addAshvoraLabel) {
      fullContentMarkdown += `\n\n${ASHVORA_ENDING_LINE}\n`;
    }


    const finalBook: GeneratedBook = {
      title: finalBookTitle,
      authorName: settings.authorName,
      language: settings.language,
      topic: settings.topic,
      writingStyle: settings.writingStyle,
      copyrightPage: settings.includeCopyrightPage ? COPYRIGHT_PAGE_TEMPLATE(settings.authorName) : null,
      disclaimerPage: settings.includeDisclaimerPage ? DISCLAIMER_PAGE_CONTENT : null,
      authorIntroduction: authorIntroduction,
      tableOfContents: tableOfContents,
      chapters: generatedChapters,
      endingPage: endingPage,
      fullContentMarkdown: fullContentMarkdown,
    };

    onProgressUpdate({ ...initialProgress, status: 'Book generation complete!', isGenerating: false, currentChapter: settings.numChapters });

    return { book: finalBook, progress: { ...initialProgress, isGenerating: false } };

  } catch (error: any) {
    console.error('Book generation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    onProgressUpdate({
      ...initialProgress,
      isGenerating: false,
      errorMessage: `Generation failed: ${errorMessage}. Please try again.`,
    });
    throw error;
  }
}

/**
 * Generates a single sample chapter for preview.
 */
export async function generateSampleChapter(
  settings: BookSettings,
  onProgressUpdate: (progress: BookGenerationProgress) => void,
  abortSignal: AbortSignal,
): Promise<Chapter> {
  const initialProgress: BookGenerationProgress = {
    status: 'Generating sample chapter...',
    currentChapter: 0,
    totalChapters: 1,
    isGenerating: true,
    errorMessage: null,
    generatedSampleChapter: null,
  };
  onProgressUpdate(initialProgress);

  try {
    // 1. Generate Book Title (if not provided)
    let finalBookTitle = settings.bookTitle;
    if (!finalBookTitle) {
      onProgressUpdate({ ...initialProgress, status: 'Generating book title for sample...' });
      finalBookTitle = await geminiService.generateBookTitle(settings.topic, settings.language);
      if (abortSignal.aborted) throw new Error('Generation aborted');
    }

    // Use a generic title for the sample chapter
    const sampleChapterTitle = "A Glimpse into the Journey";
    const chapterNumber = 1;

    onProgressUpdate({
      ...initialProgress,
      status: `Generating sample chapter content...`,
      currentChapter: chapterNumber,
    });

    const chapterContent = await geminiService.generateChapterContent(
      finalBookTitle,
      settings.topic,
      settings.writingStyle,
      settings.language,
      chapterNumber,
      sampleChapterTitle,
      Math.max(500, settings.minWordsPerChapter / 2), // Generate a shorter sample, but at least 500 words
      '' // No previous context for a single sample chapter
    );
    if (abortSignal.aborted) throw new Error('Generation aborted');

    const sampleChapter: Chapter = {
      id: chapterNumber,
      title: sampleChapterTitle,
      content: chapterContent,
    };

    onProgressUpdate({
      ...initialProgress,
      status: 'Sample chapter generated!',
      isGenerating: false,
      currentChapter: 1,
      generatedSampleChapter: sampleChapter,
    });

    return sampleChapter;

  } catch (error: any) {
    console.error('Sample chapter generation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    onProgressUpdate({
      ...initialProgress,
      isGenerating: false,
      errorMessage: `Sample generation failed: ${errorMessage}. Please try again.`,
    });
    throw error;
  }
}

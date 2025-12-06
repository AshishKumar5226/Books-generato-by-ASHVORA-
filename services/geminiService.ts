import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { Language, WritingStyle, Chapter } from '../types';

/**
 * Initializes the GoogleGenAI client with the API key from environment variables.
 * It's created on demand to ensure the latest API key is used, especially after
 * a potential `window.aistudio.openSelectKey()` call.
 */
export const getGeminiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY is not set. Please select your API key.');
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const GEMINI_MODEL = 'gemini-3-pro-preview'; // Suitable for complex text tasks, reasoning, and human-like style.

/**
 * Generates a book title based on the topic and language.
 * @param topic The main topic of the book.
 * @param language The desired language for the title.
 * @returns A suggested book title string.
 */
export async function generateBookTitle(topic: string, language: Language): Promise<string> {
  const ai = getGeminiClient();
  const prompt = `Generate a creative, catchy, and professional book title for a book about "${topic}" in ${language}. Provide only the title, no other text.`;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      temperature: 0.8,
      maxOutputTokens: 50, // Keep title concise
    },
  });

  const title = response.text?.trim() || `Untitled Book on ${topic}`;
  return title.replace(/^["'](.+(?=["']$))["']$/, '$1'); // Remove quotes if present
}

/**
 * Generates the author introduction for the book.
 * @param authorName The name of the author.
 * @param bookTitle The title of the book.
 * @param topic The topic of the book.
 * @param writingStyle The writing style of the book.
 * @param language The language of the book.
 * @returns The author introduction text.
 */
export async function generateAuthorIntroduction(
  authorName: string,
  bookTitle: string,
  topic: string,
  writingStyle: WritingStyle,
  language: Language
): Promise<string> {
  const ai = getGeminiClient();
  const prompt = `Write a compelling and inspiring author introduction for "${authorName}", who has written the book "${bookTitle}" about "${topic}" in a ${writingStyle} style, in ${language}.
  The introduction should be approximately 200-300 words, reflecting a human-written tone and connecting with the book's theme.`;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      temperature: 0.7,
      maxOutputTokens: 500,
    },
  });

  return response.text?.trim() || 'Author introduction could not be generated.';
}

/**
 * Generates a detailed Table of Contents for the book.
 * @param bookTitle The title of the book.
 * @param topic The topic of the book.
 * @param writingStyle The writing style of the book.
 * @param numChapters The desired number of chapters.
 * @param language The language of the book.
 * @returns An array of Chapter objects with titles.
 */
export async function generateTableOfContents(
  bookTitle: string,
  topic: string,
  writingStyle: WritingStyle,
  numChapters: number,
  language: Language
): Promise<Chapter[]> {
  const ai = getGeminiClient();
  const prompt = `For a book titled "${bookTitle}" about "${topic}", written in a ${writingStyle} style, in ${language}, generate a detailed and evocative table of contents with ${numChapters} distinct chapters.
  Each chapter title should be descriptive and hint at the rich content within, ensuring a logical flow for the book's narrative or message.
  Return the output as a numbered list of chapter titles, like:
  1. Chapter Title One
  2. Chapter Title Two
  ...
  ${numChapters}. Chapter Title N
  `;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      temperature: 0.7,
      maxOutputTokens: 1000,
    },
  });

  const tocText = response.text?.trim();
  if (!tocText) {
    throw new Error('Failed to generate Table of Contents.');
  }

  const chapterTitles = tocText.split('\n')
    .map(line => line.trim())
    .filter(line => line.match(/^\d+\./)) // Filter lines that start with a number and a dot
    .map((line, index) => ({
      id: index + 1,
      title: line.replace(/^\d+\.\s*/, '').trim(), // Remove the numbering
      content: '', // Content will be filled later
    }));

  return chapterTitles;
}

/**
 * Generates the content for a single chapter.
 * @param bookTitle The title of the book.
 * @param topic The topic of the book.
 * @param writingStyle The writing style of the book.
 * @param language The language of the book.
 * @param chapterNumber The current chapter number.
 * @param chapterTitle The specific title for this chapter.
 * @param minWords The minimum number of words for the chapter.
 * @param previousChapterSummary Summaries or key points from previous chapters to maintain continuity.
 * @returns The content of the generated chapter.
 */
export async function generateChapterContent(
  bookTitle: string,
  topic: string,
  writingStyle: WritingStyle,
  language: Language,
  chapterNumber: number,
  chapterTitle: string,
  minWords: number,
  previousChapterSummary: string
): Promise<string> {
  const ai = getGeminiClient();

  const continuityPrompt = previousChapterSummary
    ? `Building upon the previous chapters (summarized as: ${previousChapterSummary}), `
    : '';

  const prompt = `Based on the book titled "${bookTitle}", which is about "${topic}", written in a ${writingStyle} style, and in ${language}:
  ${continuityPrompt}
  Generate the detailed content for Chapter ${chapterNumber}: "${chapterTitle}".
  The chapter MUST be a minimum of ${minWords} words. It should be:
  - Detailed and realistic.
  - Emotional and relatable to real human life experiences (if applicable to the style).
  - Written in a human-like style with no detectable AI footprint.
  - Plagiarism-free and unique.
  - Focus on continuity with the overall story/theme of the book.
  - Do NOT include the chapter title or number within the generated text, only the content itself.
  `;

  let fullChapterContent = '';
  const streamResponse = await ai.models.generateContentStream({
    model: GEMINI_MODEL,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      temperature: 0.9, // Higher temperature for more creativity
      topP: 0.95,
      topK: 64,
      maxOutputTokens: Math.round(minWords * 1.5), // Allow more tokens than min words to ensure detail
    },
  });

  for await (const chunk of streamResponse) {
    const c = chunk as GenerateContentResponse;
    if (c.text) {
      fullChapterContent += c.text;
    }
  }

  // Basic cleanup to remove any leading/trailing chapter titles if the model accidentally includes them
  const cleanedContent = fullChapterContent
    .trim()
    .replace(new RegExp(`^Chapter ${chapterNumber}(:)? ${chapterTitle}\n*`, 'i'), '')
    .replace(new RegExp(`^${chapterTitle}\n*`, 'i'), '')
    .trim();

  return cleanedContent;
}

/**
 * Generates the ending page content for the book.
 * @param bookTitle The title of the book.
 * @param authorName The author's name.
 * @param language The language of the book.
 * @returns The gratitude and ending message.
 */
export async function generateEndingPage(
  bookTitle: string,
  authorName: string,
  language: Language
): Promise<string> {
  const ai = getGeminiClient();
  const prompt = `Write a heartfelt and inspiring ending page for the book "${bookTitle}" by "${authorName}" in ${language}.
  It should express gratitude to the reader and provide a concluding thought or message, reflecting the themes of the book.
  Keep it concise, around 100-150 words.`;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      temperature: 0.7,
      maxOutputTokens: 300,
    },
  });

  return response.text?.trim() || 'Thank you for reading!';
}
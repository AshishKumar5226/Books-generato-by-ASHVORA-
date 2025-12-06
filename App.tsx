import React, { useState, useEffect, useRef, useCallback } from 'react';
import InputPanel from './components/InputPanel';
import BookGenerationProgress from './components/BookGenerationProgress'; // Component
import GeneratedBookDisplay from './components/GeneratedBookDisplay';
import ThemeSwitcher from './components/ThemeSwitcher';
import { BookSettings, GeneratedBook, BookGenerationProgress as BookGenerationProgressType, Chapter } from './types'; // Interface
import { DEFAULT_BOOK_SETTINGS } from './constants';
import * as bookGenerator from './services/bookGenerator';
import { saveBookSettings, loadBookSettings, saveGeneratedBook, loadGeneratedBook, clearSavedBookData } from './utils/helpers';
import { GoogleGenAI } from '@google/genai'; // Required for API key check

// Helper for API key check
async function checkApiKey(): Promise<boolean> {
  // Check if window.aistudio exists and has the required functions
  if (typeof window !== 'undefined' && (window as any).aistudio && typeof (window as any).aistudio.hasSelectedApiKey === 'function') {
    return (window as any).aistudio.hasSelectedApiKey();
  }
  // Fallback for environments where window.aistudio is not available
  // In a real deployed environment, process.env.API_KEY would be set.
  return !!process.env.API_KEY;
}

const App: React.FC = () => {
  const [bookSettings, setBookSettings] = useState<BookSettings>(DEFAULT_BOOK_SETTINGS);
  const [generatedBook, setGeneratedBook] = useState<GeneratedBook | null>(null);
  const [bookProgress, setBookProgress] = useState<BookGenerationProgressType>({
    status: '',
    currentChapter: 0,
    totalChapters: 0,
    isGenerating: false,
    errorMessage: null,
    generatedSampleChapter: null,
  });
  const [apiKeySelected, setApiKeySelected] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load settings and book from local storage on mount
  useEffect(() => {
    const loadedSettings = loadBookSettings();
    if (loadedSettings) {
      setBookSettings(loadedSettings);
    }
    const loadedBook = loadGeneratedBook();
    if (loadedBook) {
      setGeneratedBook(loadedBook);
    }
    checkApiKey().then(setApiKeySelected);
  }, []);

  // Save settings to local storage whenever they change
  useEffect(() => {
    saveBookSettings(bookSettings);
  }, [bookSettings]);

  // Save generated book to local storage whenever it changes
  useEffect(() => {
    if (generatedBook) {
      saveGeneratedBook(generatedBook);
    }
  }, [generatedBook]);

  const handleSettingsChange = (newSettings: BookSettings) => {
    setBookSettings(newSettings);
  };

  const handleClearBook = useCallback(() => {
    setGeneratedBook(null);
    clearSavedBookData();
    // Reset sample chapter as well
    setBookProgress(prev => ({ ...prev, generatedSampleChapter: null }));
  }, []);

  const handleSelectApiKey = useCallback(async () => {
    if (typeof window !== 'undefined' && (window as any).aistudio && typeof (window as any).aistudio.openSelectKey === 'function') {
      try {
        await (window as any).aistudio.openSelectKey();
        // Assume success, UI will react on API_KEY presence
        setApiKeySelected(true);
      } catch (error) {
        console.error('Failed to select API key:', error);
        alert('Failed to select API key. Please try again or check your browser console.');
        setApiKeySelected(false);
      }
    } else {
      alert('API key selection not available in this environment. Ensure process.env.API_KEY is set.');
      // For local development without aistudio, assume API_KEY is set via .env or similar
      setApiKeySelected(!!process.env.API_KEY);
    }
  }, []);

  const commonGenerationLogic = useCallback(async (isSample: boolean) => {
    if (bookProgress.isGenerating) return;

    // Check API key before starting generation
    const hasKey = await checkApiKey();
    if (!hasKey) {
      alert('Please select your Gemini API key. This is required for content generation.');
      await handleSelectApiKey(); // Prompt user to select key
      // Re-check after prompt
      if (!(await checkApiKey())) {
        setBookProgress(prev => ({ ...prev, errorMessage: 'API key not selected. Cannot proceed.' }));
        return;
      }
    }

    if (!bookSettings.topic || !bookSettings.bookTitle || !bookSettings.authorName) {
      alert('Please fill in Topic, Book Title, and Author Name before generating.');
      return;
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setBookProgress({
      status: 'Starting generation...',
      currentChapter: 0,
      totalChapters: isSample ? 1 : bookSettings.numChapters,
      isGenerating: true,
      errorMessage: null,
      generatedSampleChapter: null,
    });
    setGeneratedBook(null); // Clear previous book if generating a new one

    try {
      if (isSample) {
        const sampleChapter = await bookGenerator.generateSampleChapter(
          bookSettings,
          (progress) => setBookProgress(prev => ({ ...prev, ...progress, generatedSampleChapter: progress.generatedSampleChapter })),
          signal
        );
        // Set only the sample chapter, not the full book
        setBookProgress(prev => ({ ...prev, generatedSampleChapter: sampleChapter, isGenerating: false, status: 'Sample chapter generated!' }));
      } else {
        const { book } = await bookGenerator.generateFullBook(
          bookSettings,
          (progress) => setBookProgress(prev => ({ ...prev, ...progress })),
          signal
        );
        setGeneratedBook(book);
        setBookProgress(prev => ({ ...prev, isGenerating: false, status: 'Book generation complete!' }));
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setBookProgress(prev => ({ ...prev, isGenerating: false, status: 'Generation aborted.' }));
        console.log('Book generation aborted.');
      } else if (error.message.includes('API_KEY is not set') || error.message.includes('Requested entity was not found')) {
        // If API key fails during generation, reset the flag and prompt again
        setApiKeySelected(false);
        setBookProgress(prev => ({
          ...prev,
          isGenerating: false,
          errorMessage: 'API Key issue. Please re-select your API key and try again. Ensure it is from a paid GCP project.',
        }));
        handleSelectApiKey();
      } else {
        setBookProgress(prev => ({
          ...prev,
          isGenerating: false,
          errorMessage: error.message || 'An unexpected error occurred during generation.',
        }));
        console.error('Generation Error:', error);
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [bookSettings, bookProgress.isGenerating, handleSelectApiKey]);

  const handleGenerateBook = useCallback(() => {
    commonGenerationLogic(false);
  }, [commonGenerationLogic]);

  const handleGenerateSampleChapter = useCallback(() => {
    commonGenerationLogic(true);
  }, [commonGenerationLogic]);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4 md:px-8 dark:bg-gray-900 transition-colors duration-200">
      <div className="absolute top-4 right-4 flex items-center gap-4">
        {!apiKeySelected && (
          <button
            onClick={handleSelectApiKey}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors duration-200 text-sm md:text-base"
          >
            Select Gemini API Key (Required)
          </button>
        )}
        <ThemeSwitcher />
      </div>

      <header className="text-center mb-10 mt-8 md:mt-0">
        <h1 className="text-5xl font-extrabold text-blue-700 dark:text-blue-300 mb-4 drop-shadow-md">ASHVORA Book Engine</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Unleash your creativity. Generate KDP-ready, plagiarism-free, human-style books in multiple languages with AI.
        </p>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        <InputPanel
          settings={bookSettings}
          onSettingsChange={handleSettingsChange}
          onGenerateBook={handleGenerateBook}
          onGenerateSampleChapter={handleGenerateSampleChapter}
          isGenerating={bookProgress.isGenerating}
          generatedSampleChapter={bookProgress.generatedSampleChapter}
          bookGenerationProgressStatus={bookProgress.status}
        />

        <div className="flex flex-col gap-8">
          <BookGenerationProgress progress={bookProgress} />
          {bookProgress.isGenerating && (
            <div className="text-center">
              <button
                onClick={handleStopGeneration}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors duration-200 font-semibold"
              >
                Stop Generation
              </button>
            </div>
          )}
          {generatedBook && (
            <GeneratedBookDisplay
              book={generatedBook}
              onClearBook={handleClearBook}
              addAshvoraLabel={bookSettings.addAshvoraLabel}
              pageSize={bookSettings.pageSize}
            />
          )}
        </div>
      </main>

      <footer className="mt-16 text-center text-gray-500 dark:text-gray-400 text-sm">
        <p>&copy; {new Date().getFullYear()} ASHVORA. All rights reserved.</p>
        <p className="mt-2">Powered by Google Gemini API. Created for educational, creative & publishing purposes.</p>
        {!apiKeySelected && typeof window !== 'undefined' && (window as any).aistudio && (
            <p className="mt-2 text-xs">
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                Billing information for Gemini API
              </a>
              {' is required for Veo models, but also generally recommended for production usage.'}
            </p>
        )}
      </footer>
    </div>
  );
};

export default App;
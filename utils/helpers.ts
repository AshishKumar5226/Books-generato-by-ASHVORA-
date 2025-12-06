import { BookSettings, GeneratedBook } from '../types';

/**
 * Saves book settings to local storage.
 * @param settings The book settings to save.
 */
export function saveBookSettings(settings: BookSettings) {
  try {
    localStorage.setItem('ashvora_book_settings', JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving book settings to local storage:', error);
  }
}

/**
 * Loads book settings from local storage.
 * @returns The loaded book settings, or null if not found/error.
 */
export function loadBookSettings(): BookSettings | null {
  try {
    const storedSettings = localStorage.getItem('ashvora_book_settings');
    if (storedSettings) {
      return JSON.parse(storedSettings);
    }
  } catch (error) {
    console.error('Error loading book settings from local storage:', error);
  }
  return null;
}

/**
 * Saves a generated book to local storage.
 * @param book The generated book to save.
 */
export function saveGeneratedBook(book: GeneratedBook) {
  try {
    localStorage.setItem('ashvora_generated_book', JSON.stringify(book));
  } catch (error) {
    console.error('Error saving generated book to local storage:', error);
  }
}

/**
 * Loads a generated book from local storage.
 * @returns The loaded generated book, or null if not found/error.
 */
export function loadGeneratedBook(): GeneratedBook | null {
  try {
    const storedBook = localStorage.getItem('ashvora_generated_book');
    if (storedBook) {
      return JSON.parse(storedBook);
    }
  } catch (error) {
    console.error('Error loading generated book from local storage:', error);
  }
  return null;
}

/**
 * Clears saved book settings and generated book from local storage.
 */
export function clearSavedBookData() {
  try {
    localStorage.removeItem('ashvora_book_settings');
    localStorage.removeItem('ashvora_generated_book');
  } catch (error) {
    console.error('Error clearing saved book data from local storage:', error);
  }
}

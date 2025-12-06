import React from 'react';
import { BookGenerationProgress } from '../types';

interface BookGenerationProgressProps {
  progress: BookGenerationProgress;
}

const BookGenerationProgress: React.FC<BookGenerationProgressProps> = ({ progress }) => {
  if (!progress.isGenerating && !progress.errorMessage) {
    return null;
  }

  const percentage =
    progress.totalChapters > 0
      ? Math.round((progress.currentChapter / progress.totalChapters) * 100)
      : 0;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mt-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 text-center">Generation Status</h2>

      {progress.errorMessage && (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline ml-2">{progress.errorMessage}</span>
        </div>
      )}

      {progress.isGenerating && (
        <>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <p className="text-center text-lg font-medium text-gray-700 dark:text-gray-300">
            {progress.status} ({percentage}%)
          </p>
          {progress.totalChapters > 0 && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-1">
              Chapter {progress.currentChapter} of {progress.totalChapters}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default BookGenerationProgress;

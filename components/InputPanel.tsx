import React, { useEffect, useState } from 'react';
import Input from './ui/Input';
import Select from './ui/Select';
import ToggleButton from './ui/ToggleButton';
import Button from './ui/Button';
import { BookSettings, Language, WritingStyle, PageSize, Chapter } from '../types';
import { LANGUAGES, WRITING_STYLES, PAGE_SIZES, DEFAULT_BOOK_SETTINGS } from '../constants';
import * as geminiService from '../services/geminiService';
import { generateDocxBlob } from '../services/docxGenerator';

interface InputPanelProps {
  settings: BookSettings;
  onSettingsChange: (newSettings: BookSettings) => void;
  onGenerateBook: () => void;
  onGenerateSampleChapter: () => void;
  isGenerating: boolean;
  generatedSampleChapter: Chapter | null;
  bookGenerationProgressStatus: string;
}

const InputPanel: React.FC<InputPanelProps> = ({
  settings,
  onSettingsChange,
  onGenerateBook,
  onGenerateSampleChapter,
  isGenerating,
  generatedSampleChapter,
  bookGenerationProgressStatus,
}) => {
  const [localSettings, setLocalSettings] = useState<BookSettings>(settings);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    let newValue: string | number | boolean = value;

    if (type === 'number') {
      newValue = parseInt(value, 10);
      if (isNaN(newValue) || newValue < 1) { // Ensure positive numbers
        newValue = 1;
      }
    } else if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked;
    }

    setLocalSettings((prev) => ({
      ...prev,
      [id]: newValue,
    }));
    onSettingsChange({
      ...localSettings,
      [id]: newValue,
    });
  };

  const handleToggleChange = (id: keyof BookSettings, checked: boolean) => {
    setLocalSettings((prev) => ({
      ...prev,
      [id]: checked,
    }));
    onSettingsChange({
      ...localSettings,
      [id]: checked,
    });
  };

  const handleGenerateTitle = async () => {
    if (!localSettings.topic) {
      alert('Please enter a topic to generate a book title.');
      return;
    }
    setIsGeneratingTitle(true);
    try {
      const suggestedTitle = await geminiService.generateBookTitle(
        localSettings.topic,
        localSettings.language
      );
      setLocalSettings((prev) => ({
        ...prev,
        bookTitle: suggestedTitle,
      }));
      onSettingsChange({
        ...localSettings,
        bookTitle: suggestedTitle,
      });
    } catch (error) {
      console.error('Error generating title:', error);
      alert('Failed to generate title. Please try again.');
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const calculatePageEstimate = () => {
    // Rough estimate: 300 words per page for 6x9 KDP, Times New Roman, 1.5 line spacing.
    // This will vary significantly based on font size, margins, chapter breaks, etc.
    const wordsPerChapter = localSettings.minWordsPerChapter;
    const totalWords = localSettings.numChapters * wordsPerChapter;

    let wordsPerPageFactor = 250; // Default for 6x9
    if (localSettings.pageSize === PageSize.A4) {
      wordsPerPageFactor = 500; // A4 can fit more words
    } else if (localSettings.pageSize === PageSize.FIVE_BY_EIGHT) {
      wordsPerPageFactor = 200; // 5x8 can fit fewer words
    }

    // Add extra pages for front matter (Title, Copyright, Disclaimer, TOC, Author Intro, Ending)
    const frontMatterPages = (localSettings.includeCopyrightPage ? 1 : 0) +
                             (localSettings.includeDisclaimerPage ? 1 : 0) +
                             (localSettings.autoTableOfContents ? 1 : 0) + // TOC can be multiple pages, but estimate 1 for simplicity
                             1 + // Author Intro
                             1;   // Ending page

    const estimatedPages = Math.ceil(totalWords / wordsPerPageFactor) + frontMatterPages;
    return isNaN(estimatedPages) || estimatedPages < 0 ? 0 : estimatedPages;
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 h-full overflow-y-auto">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">Book Generation Settings</h2>

      <Input
        id="topic"
        label="Topic / Subject"
        value={localSettings.topic}
        onChange={handleChange}
        placeholder="e.g., The Journey of Self-Discovery"
        required
      />

      <div className="flex items-end gap-2 mb-4">
        <div className="flex-grow">
          <Input
            id="bookTitle"
            label="Book Title"
            value={localSettings.bookTitle}
            onChange={handleChange}
            placeholder="Auto-generated or manually edited"
            disabled={isGeneratingTitle}
          />
        </div>
        <Button onClick={handleGenerateTitle} disabled={isGenerating || isGeneratingTitle} variant="secondary">
          {isGeneratingTitle ? 'Generating...' : 'Suggest Title'}
        </Button>
      </div>

      <Input
        id="authorName"
        label="Author Name"
        value={localSettings.authorName}
        onChange={handleChange}
        placeholder="e.g., Jane Doe"
        required
      />

      <Select
        id="language"
        label="Language Selection"
        value={localSettings.language}
        onChange={handleChange}
        options={LANGUAGES}
      />

      <Select
        id="writingStyle"
        label="Writing Style Selection"
        value={localSettings.writingStyle}
        onChange={handleChange}
        options={WRITING_STYLES}
      />

      <Input
        id="numChapters"
        label="Number of Chapters"
        type="number"
        value={localSettings.numChapters}
        onChange={handleChange}
        min="1"
      />

      <Input
        id="minWordsPerChapter"
        label="Minimum Words per Chapter"
        type="number"
        value={localSettings.minWordsPerChapter}
        onChange={handleChange}
        min="100" // A more realistic minimum for detailed chapters
      />

      <Select
        id="pageSize"
        label="Page Size Options"
        value={localSettings.pageSize}
        onChange={handleChange}
        options={PAGE_SIZES}
      />

      <ToggleButton
        id="includeCopyrightPage"
        label="Copyright Page"
        checked={localSettings.includeCopyrightPage}
        onChange={(checked) => handleToggleChange('includeCopyrightPage', checked)}
      />

      <ToggleButton
        id="includeDisclaimerPage"
        label="Disclaimer Page"
        checked={localSettings.includeDisclaimerPage}
        onChange={(checked) => handleToggleChange('includeDisclaimerPage', checked)}
      />

      <ToggleButton
        id="addAshvoraLabel"
        label='Add "Made by ASHVORA" option'
        checked={localSettings.addAshvoraLabel}
        onChange={(checked) => handleToggleChange('addAshvoraLabel', checked)}
      />

      <ToggleButton
        id="autoTableOfContents"
        label="Auto Table of Contents"
        checked={localSettings.autoTableOfContents}
        onChange={(checked) => handleToggleChange('autoTableOfContents', checked)}
      />

      <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-inner">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Book Size Estimate</h3>
        <p className="text-gray-700 dark:text-gray-300">
          Estimated Pages (approx): <span className="font-bold">{calculatePageEstimate()}</span>
        </p>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <Button onClick={onGenerateBook} disabled={isGenerating || !localSettings.topic || !localSettings.bookTitle || !localSettings.authorName} className="flex-1" size="lg">
          {isGenerating ? 'Generating Book...' : 'Generate Full Book'}
        </Button>
        <Button onClick={onGenerateSampleChapter} disabled={isGenerating || !localSettings.topic || !localSettings.bookTitle || !localSettings.authorName} variant="secondary" className="flex-1" size="lg">
          {isGenerating ? 'Generating Sample...' : 'Generate Sample Chapter'}
        </Button>
      </div>
      {isGenerating && (
        <p className="mt-4 text-center text-blue-600 dark:text-blue-400 font-medium">
          Status: {bookGenerationProgressStatus}
        </p>
      )}

      {generatedSampleChapter && (
        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900 rounded-xl shadow-inner border border-blue-200 dark:border-blue-700">
          <h3 className="text-xl font-bold text-blue-800 dark:text-blue-200 mb-4">Sample Chapter Preview</h3>
          <h4 className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-2">
            Chapter {generatedSampleChapter.id}: {generatedSampleChapter.title}
          </h4>
          <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 text-sm leading-relaxed max-h-96 overflow-y-auto">
            <p className="whitespace-pre-wrap">{generatedSampleChapter.content.substring(0, 1000)}...</p>
            <p className="text-right text-gray-500 dark:text-gray-400 mt-4"> (truncated for preview)</p>
          </div>
          <Button
            onClick={() => {
              const docx = generateDocxBlob(
                {
                  title: localSettings.bookTitle,
                  authorName: localSettings.authorName,
                  language: localSettings.language,
                  topic: localSettings.topic,
                  writingStyle: localSettings.writingStyle,
                  copyrightPage: null, disclaimerPage: null, authorIntroduction: '', tableOfContents: [],
                  chapters: [generatedSampleChapter],
                  endingPage: '',
                  fullContentMarkdown: generatedSampleChapter.content,
                },
                localSettings.addAshvoraLabel,
                PageSize.A4 // DOCX can be A4
              );
              docx.then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Sample_Chapter_${generatedSampleChapter.id}_${generatedSampleChapter.title}.docx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              });
            }}
            variant="ghost"
            className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Download Sample Chapter (DOCX)
          </Button>
        </div>
      )}
    </div>
  );
};

export default InputPanel;

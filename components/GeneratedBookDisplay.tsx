import React from 'react';
import { GeneratedBook, PageSize, Language } from '../types';
import Button from './ui/Button';
import { generatePdfBlob } from '../services/pdfGenerator';
import { generateDocxBlob } from '../services/docxGenerator';
import { ASHVORA_LABEL } from '../constants';
import { marked } from 'marked';

interface GeneratedBookDisplayProps {
  book: GeneratedBook | null;
  onClearBook: () => void;
  addAshvoraLabel: boolean;
  pageSize: PageSize;
}

const GeneratedBookDisplay: React.FC<GeneratedBookDisplayProps> = ({ book, onClearBook, addAshvoraLabel, pageSize }) => {
  if (!book) {
    return null;
  }

  const handleDownloadPdf = async () => {
    try {
      const pdfBlob = await generatePdfBlob(book, addAshvoraLabel, pageSize);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${book.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleDownloadDocx = async () => {
    try {
      const docxBlob = await generateDocxBlob(book, addAshvoraLabel, pageSize);
      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${book.title.replace(/[^a-z0-9]/gi, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating DOCX:', error);
      alert('Failed to generate DOCX. Please try again.');
    }
  };

  const handleDownloadChapter = (chapterId: number, chapterTitle: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Chapter_${chapterId}_${chapterTitle.replace(/[^a-z0-9]/gi, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTableOfContents = () => {
    if (!book.tableOfContents) return;
    const tocContent = book.tableOfContents.map(c => `Chapter ${c.id}: ${c.title}`).join('\n');
    const blob = new Blob([tocContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title.replace(/[^a-z0-9]/gi, '_')}_TableOfContents.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mt-8 mb-16 relative">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">Your Generated Book</h2>

      <div className="flex flex-wrap gap-4 justify-center mb-8 sticky top-0 bg-white dark:bg-gray-800 pt-4 pb-2 z-10 border-b border-gray-200 dark:border-gray-700 -mx-6 px-6">
        <Button onClick={handleDownloadPdf} variant="primary">Download PDF</Button>
        <Button onClick={handleDownloadDocx} variant="primary">Download DOCX</Button>
        {book.tableOfContents && book.tableOfContents.length > 0 && (
          <Button onClick={handleDownloadTableOfContents} variant="secondary">Download Table of Contents</Button>
        )}
        <Button onClick={onClearBook} variant="ghost" className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">Clear Book</Button>
      </div>

      <div className="prose dark:prose-invert max-w-none pb-12">
        {/* Front Cover Placeholder */}
        <div className="text-center my-12 p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900">
          <img src={`https://picsum.photos/600/900?random=${Math.random()}`} alt="Book Cover Placeholder" className="mx-auto max-w-xs md:max-w-sm lg:max-w-md h-auto mb-4 rounded shadow-md" />
          <h1 className="text-5xl font-extrabold my-4 text-blue-800 dark:text-blue-200">{book.title}</h1>
          <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">By {book.authorName}</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">A book on {book.topic}</p>
          <p className="text-gray-500 dark:text-gray-400">({book.writingStyle} style, {Language[book.language]})</p>
        </div>

        {book.copyrightPage && (
          <section className="my-16 page-break-after">
            <div className="text-center p-8 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <h2 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-200">Copyright Page</h2>
              <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: marked.parse(book.copyrightPage) }}></div>
            </div>
          </section>
        )}

        {book.disclaimerPage && (
          <section className="my-16 page-break-after">
            <div className="text-justify p-8 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <h2 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-200">Disclaimer</h2>
              <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: marked.parse(book.disclaimerPage) }}></div>
            </div>
          </section>
        )}

        {book.authorIntroduction && (
          <section className="my-16 page-break-after">
            <div className="text-center p-8 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <h2 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-200">About the Author</h2>
              <div className="text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: marked.parse(book.authorIntroduction) }}></div>
            </div>
          </section>
        )}

        {book.tableOfContents && book.tableOfContents.length > 0 && (
          <section className="my-16 page-break-after">
            <div className="p-8 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <h2 className="text-3xl font-bold mb-4 text-center text-gray-800 dark:text-gray-200">Table of Contents</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                {book.tableOfContents.map((chapter) => (
                  <li key={chapter.id} className="text-lg">
                    <span className="font-semibold">Chapter {chapter.id}:</span> {chapter.title}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {book.chapters.map((chapter) => (
          <section key={chapter.id} className="my-16 page-break-after">
            <div className="p-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
              <h2 className="text-4xl font-extrabold text-blue-700 dark:text-blue-300 mb-6 text-center">
                Chapter {chapter.id}: {chapter.title}
              </h2>
              <div className="text-gray-800 dark:text-gray-200 leading-relaxed text-lg" dangerouslySetInnerHTML={{ __html: marked.parse(chapter.content) }}></div>
              <div className="mt-8 text-right">
                <Button onClick={() => handleDownloadChapter(chapter.id, chapter.title, chapter.content)} variant="ghost" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Download Chapter {chapter.id} (Text)
                </Button>
              </div>
            </div>
          </section>
        ))}

        {book.endingPage && (
          <section className="my-16">
            <div className="text-center p-8 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <h2 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-200">Thank You</h2>
              <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: marked.parse(book.endingPage) }}></div>
              {addAshvoraLabel && (
                <p className="mt-8 text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{ASHVORA_LABEL}</p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default GeneratedBookDisplay;

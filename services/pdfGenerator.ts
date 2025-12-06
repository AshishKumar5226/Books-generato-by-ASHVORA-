import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { GeneratedBook, PageSize } from '../types';
import { ASHVORA_LABEL } from '../constants';
import { marked } from 'marked'; // For converting Markdown to HTML

// KDP 6x9 (15.24 x 22.86 cm) in inches: 6 x 9 inches
// PDF units are usually points (pt), where 1 inch = 72 points.
const INCH_TO_PT = 72;

const PAGE_SIZES_MAP = {
  'A4': { width: 8.27 * INCH_TO_PT, height: 11.69 * INCH_TO_PT },
  '6x9 KDP Standard': { width: 6 * INCH_TO_PT, height: 9 * INCH_TO_PT },
  '5x8 KDP Standard': { width: 5 * INCH_TO_PT, height: 8 * INCH_TO_PT },
};

// Margins in inches, converted to points
const DEFAULT_MARGIN_INCHES = 0.75; // Standard margin for 6x9 books
const TOP_MARGIN_PT = DEFAULT_MARGIN_INCHES * INCH_TO_PT;
const BOTTOM_MARGIN_PT = DEFAULT_MARGIN_INCHES * INCH_TO_PT;
const LEFT_MARGIN_PT = DEFAULT_MARGIN_INCHES * INCH_TO_PT;
const RIGHT_MARGIN_PT = DEFAULT_MARGIN_INCHES * INCH_TO_PT;

export async function generatePdfBlob(book: GeneratedBook, addAshvoraLabel: boolean, pageSize: PageSize): Promise<Blob> {
  const { width, height } = PAGE_SIZES_MAP[pageSize];
  const doc = new jsPDF({
    unit: 'pt',
    format: [width, height],
  });

  doc.setProperties({
    title: book.title,
    author: book.authorName,
    lang: book.language,
    creator: 'ASHVORA Book Engine',
    keywords: `${book.topic}, ${book.writingStyle}, ASHVORA, AI Generated`,
  });

  const contentDiv = document.createElement('div');
  contentDiv.style.width = `${width}pt`;
  contentDiv.style.fontFamily = 'Garamond, "Times New Roman", serif'; // Prioritize Garamond
  contentDiv.style.fontSize = '12pt'; // Base font size
  contentDiv.style.lineHeight = '1.5';
  contentDiv.style.color = '#000'; // Ensure black text for PDF
  contentDiv.style.padding = `${TOP_MARGIN_PT}pt ${RIGHT_MARGIN_PT}pt ${BOTTOM_MARGIN_PT}pt ${LEFT_MARGIN_PT}pt`;
  contentDiv.style.boxSizing = 'border-box';
  contentDiv.style.pageBreakAfter = 'always'; // Ensure each section starts on a new page


  // Helper to add a page to the PDF
  const addContentToPdf = async (element: HTMLElement) => {
    const pageContentWidth = width - LEFT_MARGIN_PT - RIGHT_MARGIN_PT;
    const pageContentHeight = height - TOP_MARGIN_PT - BOTTOM_MARGIN_PT;

    const canvas = await html2canvas(element, {
      scale: 2, // Increase scale for better quality
      useCORS: true,
      logging: false,
      scrollY: -window.scrollY, // Correct scrolling issue
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      x: element.offsetLeft,
      y: element.offsetTop,
      width: element.offsetWidth,
      height: element.offsetHeight,
    });

    const imgData = canvas.toDataURL('image/jpeg', 1.0); // Use JPEG for smaller file size, high quality
    const imgWidth = pageContentWidth; // Image width should match content width
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = TOP_MARGIN_PT;

    doc.addImage(imgData, 'JPEG', LEFT_MARGIN_PT, position, imgWidth, imgHeight);
    heightLeft -= pageContentHeight;

    while (heightLeft > 0) {
      doc.addPage();
      position = TOP_MARGIN_PT - imgHeight + heightLeft;
      doc.addImage(imgData, 'JPEG', LEFT_MARGIN_PT, position, imgWidth, imgHeight);
      heightLeft -= pageContentHeight;
    }
  };


  let pageNumber = 1;
  const addPageNumber = (pageNumber: number) => {
    doc.setFont('Garamond', 'normal');
    doc.setFontSize(10);
    const textWidth = doc.getTextWidth(pageNumber.toString());
    const x = (width / 2) - (textWidth / 2); // Center horizontally
    doc.text(pageNumber.toString(), x, height - (BOTTOM_MARGIN_PT / 2)); // Bottom center
  };


  // Front Cover Placeholder
  contentDiv.innerHTML = `
    <div style="text-align: center; padding-top: ${height / 4}pt; page-break-after: always;">
      <img src="https://picsum.photos/${Math.round(width * 0.5)}/${Math.round(height * 0.75)}?random=${Math.random()}" alt="Book Cover Placeholder" style="max-width: 60%; height: auto; margin-bottom: 20pt; border: 1pt solid #ccc; box-shadow: 0 4pt 8pt rgba(0,0,0,0.1);">
      <h1 style="font-size: 36pt; font-weight: bold; margin-bottom: 10pt;">${book.title}</h1>
      <h2 style="font-size: 20pt; font-weight: normal;">By ${book.authorName}</h2>
      <p style="font-size: 14pt; color: #555;">A book on ${book.topic}</p>
      <p style="font-size: 12pt; color: #777;">(${book.writingStyle} style, ${book.language})</p>
    </div>
  `;
  await addContentToPdf(contentDiv);
  doc.deletePage(1); // Remove the initial blank page
  doc.addPage();
  addPageNumber(pageNumber++);


  // Copyright Page
  if (book.copyrightPage) {
    contentDiv.innerHTML = `
      <div style="text-align: center; page-break-after: always;">
        <h2 style="font-size: 24pt; font-weight: bold; margin-bottom: 20pt;">Copyright Page</h2>
        <div style="font-size: 12pt;">
          ${marked.parse(book.copyrightPage)}
        </div>
      </div>
    `;
    await addContentToPdf(contentDiv);
    doc.addPage();
    addPageNumber(pageNumber++);
  }

  // Disclaimer Page
  if (book.disclaimerPage) {
    contentDiv.innerHTML = `
      <div style="text-align: justify; page-break-after: always;">
        <h2 style="font-size: 24pt; font-weight: bold; margin-bottom: 20pt; text-align: center;">Disclaimer</h2>
        <div style="font-size: 10pt;">
          ${marked.parse(book.disclaimerPage)}
        </div>
      </div>
    `;
    await addContentToPdf(contentDiv);
    doc.addPage();
    addPageNumber(pageNumber++);
  }

  // Author Introduction
  if (book.authorIntroduction) {
    contentDiv.innerHTML = `
      <div style="text-align: center; page-break-after: always;">
        <h2 style="font-size: 24pt; font-weight: bold; margin-bottom: 20pt;">About the Author</h2>
        <div style="font-size: 12pt;">
          ${marked.parse(book.authorIntroduction)}
        </div>
      </div>
    `;
    await addContentToPdf(contentDiv);
    doc.addPage();
    addPageNumber(pageNumber++);
  }

  // Table of Contents
  if (book.tableOfContents && book.tableOfContents.length > 0) {
    contentDiv.innerHTML = `
      <div style="page-break-after: always;">
        <h2 style="font-size: 24pt; font-weight: bold; margin-bottom: 20pt; text-align: center;">Table of Contents</h2>
        <ul style="list-style-type: none; padding-left: 0; font-size: 12pt;">
          ${book.tableOfContents.map(c => `
            <li style="margin-bottom: 8pt;">
              <span style="font-weight: bold;">Chapter ${c.id}:</span> ${c.title}
            </li>
          `).join('')}
        </ul>
      </div>
    `;
    await addContentToPdf(contentDiv);
    doc.addPage();
    addPageNumber(pageNumber++);
  }

  // Chapters
  for (const chapter of book.chapters) {
    contentDiv.innerHTML = `
      <div style="page-break-after: always;">
        <h2 style="font-size: 20pt; font-weight: bold; margin-bottom: 15pt; text-align: center;">Chapter ${chapter.id}: ${chapter.title}</h2>
        <div style="font-size: 12pt;">
          ${marked.parse(chapter.content)}
        </div>
      </div>
    `;
    await addContentToPdf(contentDiv);
    doc.addPage();
    addPageNumber(pageNumber++);
  }

  // Ending Page
  if (book.endingPage) {
    contentDiv.innerHTML = `
      <div style="text-align: center;">
        <h2 style="font-size: 24pt; font-weight: bold; margin-bottom: 20pt;">Thank You</h2>
        <div style="font-size: 12pt;">
          ${marked.parse(book.endingPage)}
        </div>
        ${addAshvoraLabel ? `<p style="margin-top: 40pt; font-size: 10pt; color: #555;">${ASHVORA_LABEL}</p>` : ''}
      </div>
    `;
    await addContentToPdf(contentDiv);
    doc.addPage();
    addPageNumber(pageNumber++);
  }

  // Remove the last blank page added by `addPage()` if it's truly empty.
  if (doc.internal.getNumberOfPages() > 1 && doc.getPageInfo(doc.internal.getNumberOfPages()).pageNumber === pageNumber - 1) {
    const lastPageContent = doc.internal.pages[doc.internal.getNumberOfPages()].join('');
    if (lastPageContent.trim() === '') {
      doc.deletePage(doc.internal.getNumberOfPages());
    }
  }


  return doc.output('blob');
}

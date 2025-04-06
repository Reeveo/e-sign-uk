// e-sign-uk/src/components/PdfViewer.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure the worker source for react-pdf
// Use the CDN version for simplicity, or host it locally
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
// Alternative using local copy (requires copying the worker file):
// pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PdfViewerProps {
  signedUrl: string;
}

export default function PdfViewer({ signedUrl }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const onDocumentLoadSuccess = useCallback(({ numPages: nextNumPages }: { numPages: number }) => {
    setNumPages(nextNumPages);
    setPageNumber(1); // Reset to first page on new document load
    setLoadError(null);
    setIsLoading(false);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Failed to load PDF:', error);
    setLoadError(`Failed to load PDF document. Please ensure the link is valid and accessible. Error: ${error.message}`);
    setNumPages(null);
    setIsLoading(false);
  }, []);

  const goToPreviousPage = () => {
    setPageNumber((prevPageNumber) => Math.max(prevPageNumber - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prevPageNumber) => Math.min(prevPageNumber + 1, numPages || 1));
  };

  return (
    <div className="pdf-viewer border rounded-md shadow-sm overflow-hidden">
      {/* Using literal && */}
      {isLoading && <div className="p-4 text-center">Loading PDF...</div>}
      {loadError && <div className="p-4 text-center text-red-600 bg-red-100">{loadError}</div>}

      {!isLoading && !loadError && (
        <>
          <div className="pdf-document-container bg-brand-white p-2 flex justify-center"> // Use brand white for main container
            <Document
              file={signedUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<div className="p-4 text-center">Loading document structure...</div>}
              error={<div className="p-4 text-center text-red-500">Error loading document structure.</div>}
              options={{
                 cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                 cMapPacked: true,
              }}
            >
              {/* Render the current page */}
              <Page
                pageNumber={pageNumber}
                renderTextLayer={true} // Enable text selection
                renderAnnotationLayer={true} // Enable annotations/links
                loading={<div className="p-4 text-center">Loading page {pageNumber}...</div>}
                error={<div className="p-4 text-center text-red-500">Error loading page {pageNumber}.</div>}
                // Adjust width or scale as needed
                // width={600} // Example fixed width
                scale={1.5} // Example scale
              />
            </Document>
          </div>

          {/* Using literal && and > */}
          {numPages && numPages > 1 && (
            <div className="pdf-controls flex justify-between items-center p-2 border-t bg-gray-100"> // Use light gray for controls background
              <button
                type="button"
                disabled={pageNumber <= 1}
                onClick={goToPreviousPage}
                className="px-3 py-1 border rounded bg-brand-white text-sm disabled:opacity-50 disabled:cursor-not-allowed" // Use brand white for buttons
              >
                Previous
              </button>
              <span className="text-sm">
                Page {pageNumber} of {numPages}
              </span>
              <button
                type="button"
                // Corrected null check for numPages
                disabled={!numPages || pageNumber >= numPages}
                onClick={goToNextPage}
                className="px-3 py-1 border rounded bg-brand-white text-sm disabled:opacity-50 disabled:cursor-not-allowed" // Use brand white for buttons
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
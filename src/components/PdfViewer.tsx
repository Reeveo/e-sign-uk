// e-sign-uk/src/components/PdfViewer.tsx
'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure worker for advanced viewer mode if needed
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.js`;

interface PdfViewerProps {
  signedUrl: string;
}

export default function PdfViewer({ signedUrl }: PdfViewerProps) {
  // Track states for the advanced viewer
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [validUrl, setValidUrl] = useState<boolean>(true);
  const [hasTimedOut, setHasTimedOut] = useState<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use iframe by default since it works reliably
  const [useAdvancedViewer, setUseAdvancedViewer] = useState<boolean>(false);
  
  // Setup timeout for the advanced viewer if used
  useEffect(() => {
    // Only run this effect if using advanced viewer
    if (!useAdvancedViewer) return;
    
    console.log('PDF.js version:', pdfjs.version);
    console.log('Worker source:', pdfjs.GlobalWorkerOptions.workerSrc);
    
    // Reset states when switching to advanced viewer
    setHasTimedOut(false);
    setIsLoading(true);
    
    // Clear previous timeout if it exists
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set a timeout for loading
    timeoutRef.current = setTimeout(() => {
      if (isLoading && useAdvancedViewer) {
        console.error('PDF loading timed out after 10 seconds');
        setHasTimedOut(true);
        setLoadError('PDF loading timed out. Switching back to Simple Viewer.');
        setIsLoading(false);
        // Auto-switch back to simple viewer on timeout
        setUseAdvancedViewer(false);
      }
    }, 10000); // 10 seconds timeout
    
    // Check if the URL is valid
    if (!signedUrl || signedUrl.trim() === '') {
      console.error('Invalid signed URL provided');
      setValidUrl(false);
      setLoadError('Invalid document URL provided');
      setIsLoading(false);
      return;
    }

    // Output the URL for debugging (partial, for security)
    const urlPreview = signedUrl.substring(0, 50) + (signedUrl.length > 50 ? '...' : '');
    console.log('Signed URL format:', urlPreview);
      
    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [signedUrl, isLoading, useAdvancedViewer]);

  const onDocumentLoadSuccess = useCallback(({ numPages: nextNumPages }: { numPages: number }) => {
    console.log('PDF loaded successfully with', nextNumPages, 'pages');
    // Clear the timeout since loading succeeded
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setNumPages(nextNumPages);
    setPageNumber(1);
    setLoadError(null);
    setIsLoading(false);
    setHasTimedOut(false);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Failed to load PDF:', error);
    
    // Clear the timeout since we already have an error
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setLoadError(`Failed to load PDF document: ${error.message}`);
    setNumPages(null);
    setIsLoading(false);
    
    // Auto-switch back to simple viewer on error
    setUseAdvancedViewer(false);
  }, []);

  // Function to switch to advanced viewer
  const handleUseAdvancedViewer = () => {
    setUseAdvancedViewer(true);
    setIsLoading(true);
    setLoadError(null);
    setHasTimedOut(false);
  };

  const goToPreviousPage = () => {
    setPageNumber((prevPageNumber) => Math.max(prevPageNumber - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prevPageNumber) => Math.min(prevPageNumber + 1, numPages || 1));
  };

  // If using simple viewer (default now), render iframe
  if (!useAdvancedViewer) {
    return (
      <div className="pdf-viewer border rounded-md shadow-sm overflow-hidden">
        <div className="p-2 bg-gray-100 flex justify-between items-center">
          <button
            onClick={handleUseAdvancedViewer}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded"
          >
            Try Advanced Viewer
          </button>
          <span className="text-sm">Using Simple PDF Viewer</span>
        </div>
        <iframe
          src={signedUrl}
          className="w-full h-[calc(100vh-200px)]"
          title="PDF Document"
        />
      </div>
    );
  }

  // Show advanced viewer UI
  return (
    <div className="pdf-viewer border rounded-md shadow-sm overflow-hidden">
      {/* Show loading state */}
      {isLoading && (
        <div className="p-4 text-center">
          <div>Loading PDF...</div>
          <div className="text-xs text-gray-500 mt-1">(Will timeout after 10 seconds if unresponsive)</div>
        </div>
      )}
      
      {/* Show error */}
      {(loadError || hasTimedOut) && (
        <div className="p-4 text-center text-red-600 bg-red-100">
          <p className="mb-2">{loadError || "PDF loading timed out"}</p>
          <div className="flex justify-center gap-2 mt-2">
            <button 
              onClick={() => setUseAdvancedViewer(false)}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded"
            >
              Switch to Simple Viewer
            </button>
          </div>
        </div>
      )}

      {/* Render the PDF document */}
      {!isLoading && !loadError && !hasTimedOut && validUrl && (
        <>
          <div className="pdf-document-container bg-brand-white p-2 flex justify-center">
            <Document
              file={signedUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<div className="p-4 text-center">Loading document structure...</div>}
              error={<div className="p-4 text-center text-red-500">Error loading document structure.</div>}
              options={{
                cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/cmaps/`,
                cMapPacked: true,
              }}
            >
              {/* Render the current page */}
              <Page
                pageNumber={pageNumber}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={<div className="p-4 text-center">Loading page {pageNumber}...</div>}
                error={<div className="p-4 text-center text-red-500">Error loading page {pageNumber}.</div>}
                scale={1.5}
              />
            </Document>
          </div>

          {/* Page navigation controls */}
          {numPages && numPages > 1 && (
            <div className="pdf-controls flex justify-between items-center p-2 border-t bg-gray-100">
              <button
                type="button"
                disabled={pageNumber <= 1}
                onClick={goToPreviousPage}
                className="px-3 py-1 border rounded bg-brand-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm">
                Page {pageNumber} of {numPages}
              </span>
              <button
                type="button"
                disabled={!numPages || pageNumber >= numPages}
                onClick={goToNextPage}
                className="px-3 py-1 border rounded bg-brand-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
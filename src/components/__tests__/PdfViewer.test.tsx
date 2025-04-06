// e-sign-uk/src/components/__tests__/PdfViewer.test.tsx

import React, { Dispatch, SetStateAction } from 'react'; // Keep types
// We will get original useState via requireActual inside the mock
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import PdfViewer from '../PdfViewer'; // The component to test

// --- Mock for react-pdf ---
let capturedProps: any = {}; // Re-add definition
jest.mock('react-pdf', () => ({
  __esModule: true,
  pdfjs: { GlobalWorkerOptions: { workerSrc: '' }, version: 'mock-version' },
  Document: jest.fn(({ children, loading, error }) => ( // Only need children, loading, error
    <div data-testid="mock-document">
      {/* Render children if not loading/error, otherwise render indicator */}
      {children || loading || error}
    </div>
  )),
  Page: jest.fn(({ pageNumber }) => ( // Only need pageNumber for identification
    <div data-testid="mock-page">Mock Page {pageNumber}</div>
  )),
}));

// --- Variables to capture mock setters ---
let mockSetIsLoading: Dispatch<SetStateAction<boolean>> | null = null;
let mockSetNumPages: Dispatch<SetStateAction<number | null>> | null = null;
let mockSetLoadError: Dispatch<SetStateAction<string | null>> | null = null;


// Mock CSS imports
jest.mock('react-pdf/dist/esm/Page/AnnotationLayer.css', () => ({}));
jest.mock('react-pdf/dist/esm/Page/TextLayer.css', () => ({}));

// --- Mock React module to override useState ---
jest.mock('react', () => {
  const ActualReact = jest.requireActual('react'); // Define ActualReact first
  const originalUseState = ActualReact.useState; // Capture original useState correctly HERE
  let useStateCallCount = 0; // Counter needs to be inside the mock's scope

  return {
    ...ActualReact, // Keep all other React exports
    useState: (initialState: unknown) => { // Override useState
      useStateCallCount++;
      // Logic to capture setters based on callCount or initialState
      // This relies on the order in PdfViewer.tsx: numPages, pageNumber, loadError, isLoading
      if (useStateCallCount === 1) { // numPages (initial: null)
        const [state, setState] = originalUseState(initialState); // Use correct original
        mockSetNumPages = setState as Dispatch<SetStateAction<number | null>>;
        return [state, setState];
      } else if (useStateCallCount === 3) { // loadError (initial: null)
        const [state, setState] = originalUseState(initialState); // Use correct original
        mockSetLoadError = setState as Dispatch<SetStateAction<string | null>>;
        return [state, setState];
      } else if (useStateCallCount === 4) { // isLoading (initial: true)
        const [state, setState] = originalUseState(initialState); // Use correct original
        mockSetIsLoading = setState as Dispatch<SetStateAction<boolean>>;
        return [state, setState];
      }
      // Default to original for other calls (like pageNumber - call #2)
      return originalUseState(initialState); // Use the correct original
    },
  };
});
// --- End React Mock ---

// Get references to the mocks
const MockDocument = jest.requireMock('react-pdf').Document as jest.Mock;
const MockPage = jest.requireMock('react-pdf').Page as jest.Mock;


describe('PdfViewer', () => {
  const mockSignedUrl = 'https://example.com/mock-doc.pdf';

  beforeEach(() => {
    // Reset mock setters
    mockSetIsLoading = null;
    mockSetNumPages = null;
    mockSetLoadError = null;

    // Reset captured props before each test
    capturedProps = {};

    MockDocument.mockClear();
    MockPage.mockClear();
  });

  // No afterEach needed


  it('renders loading state initially', () => {
    render(<PdfViewer signedUrl={mockSignedUrl} />);
    expect(screen.getByText('Loading PDF...')).toBeInTheDocument();
    // Document might be rendered by the component, but PdfViewer controls visibility via isLoading state
    // So we check for the loading text which is conditionally rendered based on isLoading
  });

  it('renders Document and Page after load success simulation', async () => {
    render(<PdfViewer signedUrl={mockSignedUrl} />);
    expect(screen.getByText('Loading PDF...')).toBeInTheDocument(); // Initial state

    // Since we can't reliably mock useState, we'll directly call the
    // captured callback from the react-pdf mock, assuming the component
    // would eventually render the Document and pass the callback.
    // This means we can't easily test the initial loading state disappearance.

    // Render the component - it should initially show loading
    // We need to find a way to get the callbacks captured.
    // Let's assume the component renders the Document immediately (even if hidden)
    // or we force it via a state change we *can* control (if any).
    // Re-render might not capture it if conditional.

    // Let's try calling the callback directly, assuming it gets captured.
    // This requires the Document mock to be called at least once.
    // We'll add a check for the callback before calling it.

    // Manually trigger the onLoadSuccess callback captured by the Document mock
    // We need to ensure Document was called first. Let's add a waitFor for that.
    await waitFor(() => expect(MockDocument).toHaveBeenCalled());
    expect(capturedProps.onLoadSuccess).toBeDefined();
    act(() => { if (capturedProps.onLoadSuccess) capturedProps.onLoadSuccess({ numPages: 5 }); });

    // Wait for the UI changes resulting from the callback
    await waitFor(() => {
      expect(screen.queryByText('Loading PDF...')).not.toBeInTheDocument();
      expect(screen.getByTestId('mock-page')).toBeInTheDocument(); // Page should render
      expect(screen.getByText('Page 1 of 5')).toBeInTheDocument(); // Controls should show correct pages
    });

    // Check that mocks were called as expected now that rendering happened
    expect(MockDocument).toHaveBeenCalled();
    expect(MockPage).toHaveBeenCalledWith(expect.objectContaining({ pageNumber: 1 }), {});
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('handles page navigation correctly', async () => {
     render(<PdfViewer signedUrl={mockSignedUrl} />);

     // Simulate successful load by calling the captured callback
     await waitFor(() => expect(MockDocument).toHaveBeenCalled());
     expect(capturedProps.onLoadSuccess).toBeDefined();
     act(() => { if (capturedProps.onLoadSuccess) capturedProps.onLoadSuccess({ numPages: 3 }); });
     await waitFor(() => expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()); // Wait for Page 1 UI

    const nextButton = screen.getByRole('button', { name: 'Next' });
    const prevButton = screen.getByRole('button', { name: 'Previous' });

    // Navigate pages and assert
    fireEvent.click(nextButton);
    // Wait for page number update in UI (state change happens internally)
    await waitFor(() => expect(screen.getByText('Page 2 of 3')).toBeInTheDocument());
    // Check if Page mock was called with the new page number
    expect(MockPage).toHaveBeenCalledWith(expect.objectContaining({ pageNumber: 2 }), {});

    fireEvent.click(nextButton);
    await waitFor(() => expect(screen.getByText('Page 3 of 3')).toBeInTheDocument());
    expect(MockPage).toHaveBeenCalledWith(expect.objectContaining({ pageNumber: 3 }), {});

    fireEvent.click(prevButton);
    await waitFor(() => expect(screen.getByText('Page 2 of 3')).toBeInTheDocument());
    expect(MockPage).toHaveBeenCalledWith(expect.objectContaining({ pageNumber: 2 }), {});

    fireEvent.click(prevButton);
    await waitFor(() => expect(screen.getByText('Page 1 of 3')).toBeInTheDocument());
    expect(MockPage).toHaveBeenCalledWith(expect.objectContaining({ pageNumber: 1 }), {});
  });

  it('does not render controls if only one page', async () => {
    render(<PdfViewer signedUrl={mockSignedUrl} />);

    // Simulate successful load with 1 page by calling the captured callback
    await waitFor(() => expect(MockDocument).toHaveBeenCalled());
    expect(capturedProps.onLoadSuccess).toBeDefined();
    act(() => { if (capturedProps.onLoadSuccess) capturedProps.onLoadSuccess({ numPages: 1 }); });

    // Wait for page 1 to render
    await waitFor(() => expect(screen.getByTestId('mock-page')).toHaveTextContent('Mock Page 1'));

    // Assert controls are not present
    expect(screen.queryByText(/Page 1 of 1/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });

  it('displays an error message if document loading fails', async () => {
    render(<PdfViewer signedUrl={mockSignedUrl} />);
    const errorMsg = 'Failed to load PDF document. Please ensure the link is valid and accessible. Error: Mock load error';
    expect(screen.getByText('Loading PDF...')).toBeInTheDocument();

    // Simulate the error by calling the captured callback
    await waitFor(() => expect(MockDocument).toHaveBeenCalled());
    expect(capturedProps.onLoadError).toBeDefined();
    const loadError = new Error('Mock load error'); // Define error locally
    act(() => { if (capturedProps.onLoadError) capturedProps.onLoadError(loadError); });

    // Wait for the error message UI
    await waitFor(() => {
      expect(screen.queryByText('Loading PDF...')).not.toBeInTheDocument();
      expect(screen.getByText(errorMsg)).toBeInTheDocument();
    });

    // Check that Page was not rendered
    expect(MockPage).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mock-page')).not.toBeInTheDocument();
  });
});
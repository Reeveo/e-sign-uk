'use client';

import React, { useState, ChangeEvent, useMemo } from 'react'; // Added ChangeEvent, useMemo
import SignatureModal, { SignatureData } from './SignatureModal';
import PdfViewer from './PdfViewer'; // Assuming PdfViewer is in the same directory or path is correct
// TODO: Define a proper type for DocumentField once database.types.ts is located/generated
// import { Database } from '@/types/database.types';
// type DocumentField = Database['public']['Tables']['document_fields']['Row'];
// Assuming DocumentField has at least: id, type, assigned_to_email, position_x, position_y, width, height
type DocumentField = {
  id: string;
  type: 'Signature' | 'Initials' | 'Date Signed' | 'Text' | 'Name' | 'Date of Birth' | string; // Added Name, DOB
  assigned_to_email: string | null;
  position_x: number;
  position_y: number;
  width?: number;
  height?: number;
  page_number?: number; // Optional: If fields can be on different pages
};

interface SigningAreaProps {
  signedUrl: string;
  documentName: string;
  signerEmail: string;
  fields: DocumentField[];
}

const SigningArea: React.FC<SigningAreaProps> = ({
  signedUrl,
  documentName,
  signerEmail,
  fields,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [signingFieldId, setSigningFieldId] = useState<string | null>(null);
  // Unified state for all field data (signatures, text, dates)
  const [fieldDataMap, setFieldDataMap] = useState<Record<string, SignatureData | string>>({});
  const [consentGiven, setConsentGiven] = useState(false); // State for consent checkbox
  const [isCompleting, setIsCompleting] = useState(false); // State for completion message
  // Helper function to format date as DD MMM YYYY
  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleFieldClick = (field: DocumentField) => {
    const { id: fieldId, type } = field;

    if (type === 'Signature' || type === 'Initials') {
      setSigningFieldId(fieldId);
      setIsModalOpen(true);
    } else if (type === 'Date Signed') {
      setFieldDataMap((prevMap) => ({
        ...prevMap,
        [fieldId]: formatDate(new Date()),
      }));
    } else if (type === 'Name') {
      // Attempt to derive name from email, otherwise use a placeholder
      const nameGuess = signerEmail.split('@')[0].replace(/[^a-zA-Z]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      setFieldDataMap((prevMap) => ({
        ...prevMap,
        [fieldId]: nameGuess || 'Signer Name',
      }));
    } else if (type === 'Date of Birth') {
      // For now, just put a placeholder or current date. Inline input later.
      setFieldDataMap((prevMap) => ({
        ...prevMap,
        [fieldId]: `[Select DOB]`, // Placeholder for now
        // [fieldId]: formatDate(new Date()), // Or use current date as temp value
      }));
       // TODO: Implement inline date picker later
    } else if (type === 'Text') {
       setFieldDataMap((prevMap) => ({
        ...prevMap,
        [fieldId]: `[Click to add text]`, // Placeholder for now
      }));
      // TODO: Implement inline text input later
    }
    // Add other field type handlers here if needed
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSigningFieldId(null); // Reset signing field ID when closing
  };

  const handleApplySignature = (fieldId: string, signatureData: SignatureData) => {
    setFieldDataMap((prevMap) => ({ // Update unified state
      ...prevMap,
      [fieldId]: signatureData,
    }));
    // Modal closes itself
  };

  const handleConsentChange = (event: ChangeEvent<HTMLInputElement>) => {
    setConsentGiven(event.target.checked);
  };

  const handleFinishSigning = () => {
    console.log("Finish Signing clicked. Consent given. All fields filled.");
    setIsCompleting(true);
    // TODO: Implement actual submission logic here
    // For now, just show a message for a short duration
    setTimeout(() => setIsCompleting(false), 3000); // Hide message after 3 seconds
  };

  // Determine if all required fields for the current signer are filled
  const allFieldsFilled = useMemo(() => {
    const signerFields = fields.filter(field => field.assigned_to_email === signerEmail);
    return signerFields.every(field => fieldDataMap.hasOwnProperty(field.id));
  }, [fields, signerEmail, fieldDataMap]);

  const canFinish = allFieldsFilled && consentGiven;

  return (
    <div className="flex flex-col h-screen">
      <header className="p-4 bg-gray-100 border-b">
        <h1 className="text-xl font-semibold">Sign Document</h1>
        <p>Document to Sign: <span className="font-medium">{documentName}</span></p>
        <p>Signing as: <span className="font-medium">{signerEmail}</span></p>
      </header>
      <main className="flex-grow relative overflow-hidden">
        {/* PDF Viewer Container */}
        <div className="absolute inset-0 overflow-auto">
          <PdfViewer signedUrl={signedUrl} />
        </div>

        {/* Field Placeholders Overlay */}
        {/* This assumes PdfViewer renders pages with a specific structure we can overlay onto. */}
        {/* We might need to adjust positioning logic based on PdfViewer's implementation */}
        {/* For now, using absolute positioning based on field coordinates */}
        {/* Field Placeholders Overlay - Now allows pointer events for clickable fields */}
        <div className="absolute inset-0">
          {fields.map((field) => {
            const isSignerField = field.assigned_to_email === signerEmail;
            const isClickableType = ['Signature', 'Initials', 'Date Signed', 'Name', 'Date of Birth', 'Text'].includes(field.type);
            const canClick = isSignerField && isClickableType;
            const fieldData = fieldDataMap[field.id]; // Use unified state

            return (
              <div
                key={field.id}
                className={`absolute border border-dashed ${
                  canClick ? 'border-blue-600 bg-blue-100 bg-opacity-60 cursor-pointer pointer-events-auto hover:bg-blue-200' : 'border-gray-400 bg-gray-100 bg-opacity-50 pointer-events-none'
                } flex items-center justify-center overflow-hidden`} // Added flex centering and overflow hidden
                style={{
                  left: `${field.position_x}%`,
                  top: `${field.position_y}%`,
                  width: `${field.width || 100}px`,
                  height: `${field.height || 30}px`,
                  // TODO: Adjust positioning based on page number if applicable (field.page_number)
                }}
                onClick={canClick ? () => handleFieldClick(field) : undefined} // Pass the whole field object
                title={canClick ? `Click to add ${field.type}` : `Field: ${field.type} (Assigned to: ${field.assigned_to_email || 'Anyone'})`}
              >
                {fieldData ? (
                  typeof fieldData === 'string' ? (
                    // Display text/date data
                    <span className="text-sm p-1 whitespace-nowrap overflow-hidden text-ellipsis">
                      {fieldData}
                    </span>
                  ) : fieldData.type === 'draw' ? (
                    // Display drawn signature
                    <img
                      src={fieldData.data}
                      alt={`${field.type} Signature`}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    // Display typed signature
                    <span
                      className={`${fieldData.fontStyle || 'font-sans'} text-lg whitespace-nowrap`}
                      style={{ fontSize: 'clamp(10px, 4vh, 24px)' }}
                    >
                      {fieldData.data}
                    </span>
                  )
                ) : (
                  // Show placeholder if no data yet
                  <span className={`text-xs ${canClick ? 'text-blue-800' : 'text-gray-600'} p-1`}>
                    {field.type}
                    {canClick && ' (Click)'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onApplySignature={handleApplySignature}
        signingFieldId={signingFieldId}
      />
      <footer className="p-4 bg-gray-100 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="consentCheckbox"
            checked={consentGiven}
            onChange={handleConsentChange}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="consentCheckbox" className="text-sm text-gray-700">
            I agree to use electronic records and signatures.
          </label>
        </div>
        <button
          onClick={handleFinishSigning}
          disabled={!canFinish || isCompleting}
          className={`px-6 py-2 rounded text-white font-semibold transition-colors duration-200 ease-in-out ${
            canFinish && !isCompleting
              ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {isCompleting ? 'Completing...' : 'Finish Signing'}
        </button>
      </footer>
    </div>
  );
};

export default SigningArea;
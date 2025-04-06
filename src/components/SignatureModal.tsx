// e-sign-uk/src/components/SignatureModal.tsx

import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySignature: (fieldId: string, signatureData: SignatureData) => void;
  signingFieldId: string | null;
}

export interface SignatureData {
  type: 'draw' | 'type';
  data: string; // data URL for draw, text for type
  fontStyle?: string; // e.g., 'font-signature-1'
}

const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onApplySignature,
  signingFieldId,
}) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  const [selectedFontStyle, setSelectedFontStyle] = useState('font-cursive'); // Default font
  const sigCanvasRef = useRef<SignatureCanvas>(null);

  const handleClear = () => {
    sigCanvasRef.current?.clear();
  };

  const handleApply = () => {
    if (!signingFieldId) return;

    let signatureData: SignatureData;

    if (activeTab === 'draw') {
      if (sigCanvasRef.current?.isEmpty()) {
        // TODO: Add user feedback (e.g., alert or inline message)
        console.warn('Signature canvas is empty.');
        return;
      }
      signatureData = {
        type: 'draw',
        data: sigCanvasRef.current?.getTrimmedCanvas().toDataURL('image/png') || '',
      };
    } else { // type
      if (!typedName.trim()) {
         // TODO: Add user feedback
        console.warn('Typed name is empty.');
        return;
      }
      signatureData = {
        type: 'type',
        data: typedName,
        fontStyle: selectedFontStyle,
      };
    }

    onApplySignature(signingFieldId, signatureData);
    handleClose(); // Close modal after applying
  };

  const handleClose = () => {
    // Reset state on close
    setTypedName('');
    setSelectedFontStyle('font-cursive');
    sigCanvasRef.current?.clear();
    setActiveTab('draw');
    onClose();
  };

  // Define some example signature font styles (Tailwind classes)
  // Ensure these classes correspond to actual font definitions in your CSS/Tailwind config
  const fontStyles = [
    { name: 'Cursive', class: 'font-cursive' },
    { name: 'Fantasy', class: 'font-fantasy' },
    { name: 'Handwriting', class: 'font-handwriting' },
    { name: 'Elegant', class: 'font-elegant' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Provide Your Signature</h2>

        {/* Tabs */}
        <div className="mb-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('draw')}
              className={`${
                activeTab === 'draw'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Draw
            </button>
            <button
              onClick={() => setActiveTab('type')}
              className={`${
                activeTab === 'type'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Type
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div>
          {activeTab === 'draw' && (
            <div className="flex flex-col items-center">
              <SignatureCanvas
                ref={sigCanvasRef}
                penColor="black"
                canvasProps={{
                  width: 400,
                  height: 150,
                  className: 'sigCanvas border border-gray-300 rounded',
                }}
              />
              <button
                onClick={handleClear}
                className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
              >
                Clear
              </button>
            </div>
          )}

          {activeTab === 'type' && (
            <div>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Type your name"
                className="w-full p-2 border border-gray-300 rounded mb-4"
              />
              <p className="text-sm text-gray-600 mb-2">Select a style:</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {fontStyles.map((style) => (
                  <button
                    key={style.class}
                    onClick={() => setSelectedFontStyle(style.class)}
                    className={`p-4 border rounded text-center ${
                      selectedFontStyle === style.class
                        ? 'border-indigo-500 ring-2 ring-indigo-200'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {/* Display typed name in the selected font style, or the style name if input is empty */}
                    <span className={`${style.class} text-xl`}>
                      {typedName || style.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Apply Signature
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignatureModal;

// Reminder: Ensure font classes like 'font-cursive', 'font-fantasy', etc.
// are defined in your tailwind.config.ts or globals.css.
// Example in globals.css:
/*
@import url('https://fonts.googleapis.com/css2?family=Dancing+Script&family=Great+Vibes&family=Sacramento&display=swap');

.font-cursive { font-family: 'Dancing Script', cursive; }
.font-fantasy { font-family: 'Great Vibes', cursive; }
.font-handwriting { font-family: 'Sacramento', cursive; }
.font-elegant { font-family: 'Times New Roman', Times, serif; } // Example fallback
*/
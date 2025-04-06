'use client';

import React from 'react';
import PdfViewer from './PdfViewer'; // Assuming PdfViewer is in the same directory or path is correct
// TODO: Define a proper type for DocumentField once database.types.ts is located/generated
// import { Database } from '@/types/database.types';
// type DocumentField = Database['public']['Tables']['document_fields']['Row'];
type DocumentField = any; // Placeholder type

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
        <div className="absolute inset-0 pointer-events-none">
          {fields.map((field) => (
            <div
              key={field.id}
              className="absolute border border-dashed border-blue-500 bg-blue-100 bg-opacity-50"
              style={{
                left: `${field.position_x}%`, // Assuming coordinates are percentages
                top: `${field.position_y}%`,
                width: `${field.width || 100}px`, // Provide default or use actual field width if available
                height: `${field.height || 30}px`, // Provide default or use actual field height if available
                // TODO: Adjust positioning based on page number if applicable
              }}
            >
              <span className="text-xs text-blue-800 p-1">{field.type}</span>
            </div>
          ))}
        </div>
      </main>
      <footer className="p-4 bg-gray-100 border-t">
        {/* Placeholder for signing actions */}
        <p className="text-sm text-gray-600">Review the document and fields above. Signing actions will appear here.</p>
      </footer>
    </div>
  );
};

export default SigningArea;
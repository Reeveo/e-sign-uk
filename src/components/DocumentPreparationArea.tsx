'use client';

import React, { useState, useRef, useCallback } from 'react';
import { DndProvider, useDrop } from 'react-dnd'; // Removed unused XYCoord
import { HTML5Backend } from 'react-dnd-html5-backend';
import PdfViewer from './PdfViewer';
import FieldPalette, { FieldTypes } from './FieldPalette';
import SignerInput from './SignerInput';
import FieldProperties from './FieldProperties'; // Import the new component
import { v4 as uuidv4 } from 'uuid';
// Define the structure for a placed field
interface PlacedField {
  id: string;
  type: string; // Corresponds to one of the FieldTypes values
  x: number; // Position relative to the drop target
  y: number;
  pageNumber: number; // Page number where the field is placed
  signerEmail?: string; // Optional: Email of the assigned signer
}

// Define the structure for a signer
interface Signer {
  id: string;
  email: string;
}

// Define the structure for the drag item (consistent with FieldPalette)
interface FieldDragItem {
  type: string;
}

interface DocumentPreparationAreaProps {
  signedUrl: string;
  documentName: string;
  documentId: string; // Add documentId prop
}

const DocumentPreparationAreaInternal: React.FC<DocumentPreparationAreaProps> = ({ signedUrl, documentName, documentId }) => {
  const [placedFields, setPlacedFields] = useState<PlacedField[]>([]);
  const [signers, setSigners] = useState<Signer[]>([]); // State for signers
  const dropTargetRef = useRef<HTMLDivElement>(null); // Ref for the drop target area
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null); // State for selected field ID
  const [isSaving, setIsSaving] = useState<boolean>(false); // State for loading indicator (covers both save and send)
  const [saveError, setSaveError] = useState<string | null>(null); // State for save errors
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [sendError, setSendError] = useState<string | null>(null); // State for send errors

  // useDrop hook setup
  const [{ canDrop, isOver }, drop] = useDrop(() => ({
    accept: Object.values(FieldTypes), // Accept all defined field types
    drop: (item: FieldDragItem, monitor) => {
      const offset = monitor.getClientOffset(); // Get drop position relative to viewport
      const targetRect = dropTargetRef.current?.getBoundingClientRect(); // Get drop target position

      if (offset && targetRect) {
        // Calculate position relative to the drop target
        const x = offset.x - targetRect.left;
        const y = offset.y - targetRect.top;

        // Add the new field to state
        setPlacedFields((prevFields) => [
          ...prevFields,
          // TODO: Determine actual page number based on drop location
          { id: uuidv4(), type: item.type, x, y, pageNumber: 1 },
        ]);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }));

  // Attach the drop ref to the target element
  drop(dropTargetRef);

  // Callback to potentially update field position (for bonus drag within area)
  // const moveField = useCallback((id: string, x: number, y: number) => {
  //   setPlacedFields((prevFields) =>
  //     prevFields.map((field) => (field.id === id ? { ...field, x, y } : field))
  //   );
  // }, []);

  // Handler to add a new signer
  const handleAddSigner = (email: string) => {
    const newSigner: Signer = {
      id: uuidv4(),
      email,
    };
    setSigners((prevSigners) => [...prevSigners, newSigner]);
  };

  // Handler to remove a signer
  const handleRemoveSigner = (idToRemove: string) => {
    const signerToRemove = signers.find(s => s.id === idToRemove);
    if (!signerToRemove) return;

    // Remove the signer from the list
    setSigners((prevSigners) => prevSigners.filter((signer) => signer.id !== idToRemove));

    // Unassign this signer from any fields
    setPlacedFields((prevFields) =>
      prevFields.map((field) =>
        field.signerEmail === signerToRemove.email ? { ...field, signerEmail: undefined } : field
      )
    );

    // If the removed signer was assigned to the currently selected field, update properties panel
    if (selectedField?.signerEmail === signerToRemove.email) {
        // The selectedField state derived below will update automatically,
        // but if we wanted direct action, it could go here.
    }
  };

  // Handler to reorder signers
  const handleReorderSigners = (reorderedSigners: Signer[]) => {
    setSigners(reorderedSigners);
    // Note: Field assignments don't need to change on reorder, only the signing sequence matters.
  };

  // Handler to select a field
  const handleSelectField = (fieldId: string) => {
    setSelectedFieldId(fieldId);
  };

  // Handler to assign a signer to the selected field
  const handleAssignSigner = (signerEmail: string | null) => {
    if (!selectedFieldId) return;

    setPlacedFields((prevFields) =>
      prevFields.map((field) =>
        field.id === selectedFieldId
          ? { ...field, signerEmail: signerEmail ?? undefined } // Use undefined if null to remove assignment
          : field
      )
    );
    // Optionally, deselect field after assignment?
    // setSelectedFieldId(null);
  };

  // Find the selected field object based on the ID
  const selectedField = placedFields.find(field => field.id === selectedFieldId) || null;

  // Handler to save the preparation state
  const handleSave = async () => {
    setIsSaving(true); // Indicate loading starts
    setSaveError(null);
    setSendStatus('idle'); // Reset send status on new attempt
    setSendError(null);

    // Prepare payload for the API
    const payload = {
      signers: signers.map((signer, index) => ({
        email: signer.email,
        order: index + 1, // Order based on current array index
        // name: signer.name // Include if name is stored in Signer interface
      })),
      fields: placedFields.map(field => ({
        type: field.type,
        pageNumber: field.pageNumber, // Use the stored page number
        xCoordinate: field.x,
        yCoordinate: field.y,
        signerEmail: field.signerEmail ?? null, // Send null if undefined
        // Include other properties like width, height, required if needed
      })),
    };

    try {
      const response = await fetch(`/api/documents/${documentId}/prepare`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

     // Handle success of saving preparation
     console.log('Preparation saved successfully!'); // Log instead of alert for now

     // Now, trigger the send endpoint
     setSendStatus('sending');
     try {
       const sendResponse = await fetch(`/api/documents/${documentId}/send`, {
         method: 'POST',
         // No body needed for this specific endpoint based on its design
       });

       if (!sendResponse.ok) {
         const sendErrorData = await sendResponse.json();
         throw new Error(sendErrorData.error || `Send failed: ${sendResponse.status}`);
       }

       // Handle success of sending
       setSendStatus('success');
       alert('Document sent to the first signer!'); // Confirmation message
       // Optionally navigate or update UI further
       // Example navigation (optional):
       // import { useRouter } from 'next/navigation';
       // const router = useRouter();
       // router.push('/dashboard');

     } catch (sendErr: any) {
       console.error('Failed to send document:', sendErr);
       setSendStatus('error');
       setSendError(sendErr.message || 'An unknown error occurred during sending.');
       alert(`Error sending document: ${sendErr.message || 'An unknown error occurred.'}`); // Simple feedback
     }
    } catch (error: any) {
      console.error('Failed to save document preparation:', error);
     // Error from the initial save preparation step
     setSaveError(error.message || 'An unknown error occurred during save.');
     alert(`Error saving preparation: ${error.message || 'An unknown error occurred.'}`); // Simple feedback for save error
   } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-row gap-4 h-[calc(100vh-150px)]"> {/* Main flex container */}
      {/* Sidebar for Palette and Signers */}
      <div className="w-64 flex-shrink-0 space-y-4 overflow-y-auto p-2 border-r"> {/* Added sidebar */}
        <SignerInput
          signers={signers}
          onAddSigner={handleAddSigner}
          onRemoveSigner={handleRemoveSigner}
          onReorderSigners={handleReorderSigners}
        />
        <FieldPalette />
        {/* Conditionally render FieldProperties when a field is selected */}
        <FieldProperties
           selectedField={selectedField}
           signers={signers}
           onAssignSigner={handleAssignSigner}
        />
        {/* Save Button */}
        <div className="mt-4 pt-4 border-t">
           <button
             onClick={handleSave}
             disabled={isSaving}
             className="w-full bg-brand-primary text-white py-2 px-4 rounded hover:bg-brand-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {isSaving ? 'Saving...' : 'Save & Continue'}
          </button>
          {saveError && <p className="text-red-600 text-sm mt-1">Save Error: {saveError}</p>}
          {sendStatus === 'sending' && <p className="text-blue-600 text-sm mt-1">Sending document...</p>}
          {sendError && <p className="text-red-600 text-sm mt-1">Send Error: {sendError}</p>}
          {sendStatus === 'success' && <p className="text-green-600 text-sm mt-1">Document sent successfully!</p>}
        </div>
      </div>

      {/* Drop Target Area & PDF Viewer */}
      <div
        ref={dropTargetRef}
        className={`flex-grow border relative ${isOver && canDrop ? 'bg-brand-green bg-opacity-25' : 'bg-brand-white'} overflow-auto`} // Use brand colors for drop area
      >
        {/* PDF Viewer */}
        <div className="relative"> {/* Container for positioning fields */}
          <PdfViewer signedUrl={signedUrl} />

          {/* Render Placed Fields */}
          {placedFields.map((field) => {
            const isSelected = field.id === selectedFieldId;
            return (
              <div
                key={field.id}
                className={`absolute p-1 border text-xs rounded cursor-pointer ${
                  isSelected
                    ? 'border-brand-primary ring-2 ring-brand-primary bg-brand-secondary bg-opacity-75' // Highlight selected field
                    : 'border-gray-400 bg-brand-secondary bg-opacity-50 hover:bg-opacity-60' // Standard appearance
                }`}
                style={{ left: `${field.x}px`, top: `${field.y}px` }}
                onClick={() => handleSelectField(field.id)}
                // Add drag logic here for bonus if implementing repositioning
              >
                {field.type}
                {/* Optional: Display assigned signer info directly */}
                {/* {field.signerEmail && <span className="block text-[10px] truncate">({field.signerEmail})</span>} */}
              </div>
            );
          })}
          {/* ))}` <-- Remove this extra closing part */}
        </div>
      </div>
    </div>
  );
}; // <-- This should be the closing brace for the DocumentPreparationAreaInternal component function

// Wrapper component to provide DndProvider
const DocumentPreparationArea: React.FC<DocumentPreparationAreaProps> = (props) => (
  <DndProvider backend={HTML5Backend}>
    <DocumentPreparationAreaInternal {...props} />
  </DndProvider>
);

export default DocumentPreparationArea;
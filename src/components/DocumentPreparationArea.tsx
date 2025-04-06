'use client';

import React, { useState, useRef, useCallback } from 'react';
import { DndProvider, useDrop, XYCoord } from 'react-dnd';
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
}

const DocumentPreparationAreaInternal: React.FC<DocumentPreparationAreaProps> = ({ signedUrl, documentName }) => {
  const [placedFields, setPlacedFields] = useState<PlacedField[]>([]);
  const [signers, setSigners] = useState<Signer[]>([]); // State for signers
  const dropTargetRef = useRef<HTMLDivElement>(null); // Ref for the drop target area
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null); // State for selected field ID

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
          { id: uuidv4(), type: item.type, x, y },
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
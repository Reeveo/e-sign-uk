'use client';

import React, { useState, useRef, useCallback } from 'react';
import { DndProvider, useDrop, XYCoord } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import PdfViewer from './PdfViewer';
import FieldPalette, { FieldTypes } from './FieldPalette'; // Import FieldTypes
import { v4 as uuidv4 } from 'uuid'; // For unique IDs

// Define the structure for a placed field
interface PlacedField {
  id: string;
  type: string; // Corresponds to one of the FieldTypes values
  x: number; // Position relative to the drop target
  y: number;
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
  const dropTargetRef = useRef<HTMLDivElement>(null); // Ref for the drop target area

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

  return (
    <div className="flex flex-row gap-4 h-[calc(100vh-150px)]"> {/* Adjust height as needed */}
      {/* Field Palette */}
      <FieldPalette />

      {/* Drop Target Area & PDF Viewer */}
      <div
        ref={dropTargetRef}
        className={`flex-grow border relative ${isOver && canDrop ? 'bg-green-100' : 'bg-gray-100'}`}
        style={{ overflow: 'auto' }} // Allow scrolling if PDF is large
      >
        {/* PDF Viewer */}
        <div className="relative"> {/* Container for positioning fields */}
          <PdfViewer signedUrl={signedUrl} />

          {/* Render Placed Fields */}
          {placedFields.map((field) => (
            <div
              key={field.id}
              className="absolute p-1 border bg-yellow-200 bg-opacity-75 text-xs rounded cursor-move" // Basic styling for placed fields
              style={{ left: `${field.x}px`, top: `${field.y}px` }}
              // Add drag logic here for bonus if implementing repositioning
            >
              {field.type}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Wrapper component to provide DndProvider
const DocumentPreparationArea: React.FC<DocumentPreparationAreaProps> = (props) => (
  <DndProvider backend={HTML5Backend}>
    <DocumentPreparationAreaInternal {...props} />
  </DndProvider>
);


export default DocumentPreparationArea;
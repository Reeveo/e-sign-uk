'use client';

import React, { useRef } from 'react'; // Import useRef
import { useDrag, DragSourceMonitor } from 'react-dnd';

// Define the types of fields available
export const FieldTypes = {
  SIGNATURE: 'signature',
  INITIALS: 'initials',
  NAME: 'name',
  DATE_SIGNED: 'dateSigned',
  DATE_OF_BIRTH: 'dateOfBirth',
  TEXT_BOX: 'textBox',
};

// Define the structure for the drag item
interface FieldDragItem {
  type: string;
}

// Define the collected props type
interface CollectedProps {
  isDragging: boolean;
}

interface DraggableFieldProps {
  fieldType: string;
  label: string;
}

// Component for a single draggable field type
const DraggableField: React.FC<DraggableFieldProps> = ({ fieldType, label }) => {
  const ref = useRef<HTMLDivElement>(null); // Create a ref for the div
  // Explicitly type the hook and collect function
  const [{ isDragging }, drag] = useDrag<FieldDragItem, void, CollectedProps>(() => ({
    type: fieldType,
    item: { type: fieldType },
    collect: (monitor: DragSourceMonitor<FieldDragItem, void>): CollectedProps => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  // Connect the drag source to the ref
  drag(ref);

  return (
    <div
      ref={ref} // Assign the created ref to the div
      className={`p-2 m-1 border rounded cursor-grab ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } bg-brand-secondary bg-opacity-75 hover:bg-brand-secondary text-brand-white`} // Use brand color for draggable fields
      role="button"
      aria-label={`Drag ${label} field`}
    >
      {label}
    </div>
  );
};

// The main palette component
const FieldPalette: React.FC = () => {
  return (
    <div className="p-4 border rounded shadow-md bg-brand-white w-48"> // Use brand white for palette background
      <h3 className="text-lg font-semibold mb-2">Fields</h3>
      <DraggableField fieldType={FieldTypes.SIGNATURE} label="Signature" />
      <DraggableField fieldType={FieldTypes.INITIALS} label="Initials" />
      <DraggableField fieldType={FieldTypes.NAME} label="Name" />
      <DraggableField fieldType={FieldTypes.DATE_SIGNED} label="Date Signed" />
      <DraggableField fieldType={FieldTypes.DATE_OF_BIRTH} label="Date of Birth" />
      <DraggableField fieldType={FieldTypes.TEXT_BOX} label="Text Box" />
    </div>
  );
};

export default FieldPalette;
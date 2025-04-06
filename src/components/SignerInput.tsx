'use client';

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { XMarkIcon } from '@heroicons/react/24/solid'; // Using Heroicons for the remove icon

interface Signer {
  id: string;
  email: string;
}

interface SignerInputProps {
  signers: Signer[];
  onAddSigner: (email: string) => void;
  onRemoveSigner: (id: string) => void; // Prop for removing a signer
  onReorderSigners: (signers: Signer[]) => void; // Prop for reordering signers
}

// Component for each sortable signer item
interface SortableSignerItemProps {
  id: string;
  email: string;
  index: number;
  onRemove: (id: string) => void;
}

function SortableSignerItem({ id, email, index, onRemove }: SortableSignerItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging, // Added to style the item while dragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1, // Make item semi-transparent when dragging
    cursor: 'grab', // Indicate draggable item
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex justify-between items-center p-2 bg-gray-50 border rounded mb-1 touch-none" // Added touch-none for better mobile drag
    >
      <span className="flex items-center">
        <span className="mr-2 text-gray-500 font-medium">{index + 1}.</span> {/* Numbering */}
        <span className="text-sm text-gray-800">{email}</span>
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent drag listener from firing on button click
          onRemove(id);
        }}
        className="p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100 focus:outline-none focus:ring-1 focus:ring-red-500"
        aria-label={`Remove signer ${email}`}
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </li>
  );
}


const SignerInput: React.FC<SignerInputProps> = ({
  signers,
  onAddSigner,
  onRemoveSigner,
  onReorderSigners,
}) => {
  const [email, setEmail] = useState('');
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddClick = () => {
    if (email.trim() && /\S+@\S+\.\S+/.test(email)) { // Basic email validation
      // Check if email already exists (case-insensitive)
      if (!signers.some(signer => signer.email.toLowerCase() === email.trim().toLowerCase())) {
        onAddSigner(email.trim());
        setEmail(''); // Clear input after adding
      } else {
        console.warn('Email address already added.');
        // Optionally, provide user feedback here (e.g., using a toast notification)
      }
    } else {
      console.warn('Invalid email address entered.');
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleAddClick();
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = signers.findIndex((signer) => signer.id === active.id);
      const newIndex = signers.findIndex((signer) => signer.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedSigners = arrayMove(signers, oldIndex, newIndex);
        onReorderSigners(reorderedSigners); // Call the prop to update state in parent
      }
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-brand-white">
      <h3 className="text-lg font-semibold mb-3">Signers (Drag to Reorder)</h3>
      <div className="flex gap-2 mb-4">
        <input
          type="email"
          value={email}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Signer's email address"
          className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
        />
        <button
          onClick={handleAddClick}
          className="px-4 py-2 bg-brand-primary text-brand-white rounded-md hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50"
          disabled={!email.trim()}
        >
          Add
        </button>
      </div>

      {signers.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={signers.map(signer => signer.id)} // Pass IDs for SortableContext
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-1"> {/* Removed list-disc and pl-5 */}
              {signers.map((signer, index) => (
                <SortableSignerItem
                  key={signer.id}
                  id={signer.id}
                  email={signer.email}
                  index={index}
                  onRemove={onRemoveSigner}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default SignerInput;
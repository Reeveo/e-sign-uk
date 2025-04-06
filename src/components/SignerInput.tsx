'use client';

import React, { useState } from 'react';

interface Signer {
  id: string;
  email: string;
}

interface SignerInputProps {
  signers: Signer[];
  onAddSigner: (email: string) => void;
  // Optional props for bonus features
  // onRemoveSigner?: (id: string) => void;
  // onReorderSigners?: (signers: Signer[]) => void;
}

const SignerInput: React.FC<SignerInputProps> = ({
  signers,
  onAddSigner,
  // onRemoveSigner,
  // onReorderSigners,
}) => {
  const [email, setEmail] = useState('');

  const handleAddClick = () => {
    if (email.trim() && /\S+@\S+\.\S+/.test(email)) { // Basic email validation
      onAddSigner(email);
      setEmail(''); // Clear input after adding
    } else {
      // Optional: Add user feedback for invalid email
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

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-brand-white"> // Use brand white for container
      <h3 className="text-lg font-semibold mb-3">Signers</h3>
      <div className="flex gap-2 mb-4">
        <input
          type="email"
          value={email}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Signer's email address"
          className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" // Use brand color for focus
        />
        <button
          onClick={handleAddClick}
          className="px-4 py-2 bg-brand-primary text-brand-white rounded-md hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50" // Use brand colors for add button
          disabled={!email.trim()}
        >
          Add
        </button>
      </div>

      {signers.length > 0 && (
        <div>
          <h4 className="text-md font-medium mb-2">Added Signers:</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
            {signers.map((signer) => (
              <li key={signer.id} className="flex justify-between items-center">
                <span>{signer.email}</span>
                {/* Optional: Add remove button here */}
                {/* <button
                  onClick={() => onRemoveSigner?.(signer.id)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  Remove
                </button> */}
              </li>
            ))}
          </ul>
          {/* Optional: Add drag-and-drop reordering UI here */}
        </div>
      )}
    </div>
  );
};

export default SignerInput;
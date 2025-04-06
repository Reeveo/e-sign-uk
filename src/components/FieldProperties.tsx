import React from 'react';

// Re-use or import these types if they are defined centrally
interface PlacedField {
  id: string;
  type: string;
  x: number;
  y: number;
  signerEmail?: string;
}

interface Signer {
  id: string;
  email: string;
}

interface FieldPropertiesProps {
  selectedField: PlacedField | null;
  signers: Signer[];
  onAssignSigner: (signerEmail: string | null) => void;
}

const FieldProperties: React.FC<FieldPropertiesProps> = ({
  selectedField,
  signers,
  onAssignSigner,
}) => {
  if (!selectedField) {
    return null; // Don't render anything if no field is selected
  }

  const handleSignerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedEmail = event.target.value;
    onAssignSigner(selectedEmail === '' ? null : selectedEmail);
  };

  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-3">Field Properties</h3>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Field Type
        </label>
        <p className="text-sm text-gray-900 bg-gray-100 p-2 rounded">
          {selectedField.type}
        </p>
      </div>
      <div>
        <label
          htmlFor="signer-select"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Assign to Signer
        </label>
        <select
          id="signer-select"
          name="signer"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm rounded-md"
          value={selectedField.signerEmail ?? ''}
          onChange={handleSignerChange}
          disabled={signers.length === 0} // Disable if no signers exist
        >
          <option value="">{signers.length > 0 ? 'Select Signer...' : 'No signers added'}</option>
          {signers.map((signer) => (
            <option key={signer.id} value={signer.email}>
              {signer.email}
            </option>
          ))}
        </select>
        {signers.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">Add signers using the input above.</p>
        )}
      </div>
    </div>
  );
};

export default FieldProperties;
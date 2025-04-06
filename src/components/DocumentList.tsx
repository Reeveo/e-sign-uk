import Link from 'next/link';
import { format } from 'date-fns'; // Using date-fns for date formatting

// Define the shape of a document object based on the fetched data
interface Document {
  id: string;
  filename: string | null;
  status: string | null; // Assuming status is a string, adjust if needed
  created_at: string; // Supabase returns timestamp as string
}

interface DocumentListProps {
  documents: Document[] | null; // Allow null in case of fetch error or no documents
}

export default function DocumentList({ documents }: DocumentListProps) {
  if (!documents || documents.length === 0) {
    return (
      <p className="text-center text-gray-500 py-4">
        You haven't uploaded any documents yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Filename
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Status
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Uploaded On
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {documents.map((doc) => (
            <tr key={doc.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {doc.filename || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {/* Basic status styling - can be enhanced */}
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    doc.status === 'Completed' // Example status check
                      ? 'bg-green-100 text-green-800'
                      : doc.status === 'Pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800' // Default/Draft
                  }`}
                >
                  {doc.status || 'Draft'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {format(new Date(doc.created_at), 'PPpp')} {/* Format date */}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Link
                  href={`/documents/${doc.id}/prepare`} // Placeholder link
                  className="text-indigo-600 hover:text-indigo-900 mr-4"
                >
                  Prepare
                </Link>
                <Link
                  href={`/documents/${doc.id}/view`} // Placeholder link
                  className="text-gray-600 hover:text-gray-900"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
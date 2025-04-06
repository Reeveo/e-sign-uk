// src/app/page.tsx
import Link from 'next/link';
import AuthButton from '@/components/AuthButton'; // Import the new component
import { LockClosedIcon, DocumentPlusIcon, PaperAirplaneIcon, PencilSquareIcon } from '@heroicons/react/24/outline'; // Using Heroicons for illustrative icons

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-brand-white">
      {/* Header/Nav Placeholder - Can be added later */}
      <header className="w-full p-4 bg-brand-white shadow-sm">
        <nav className="container mx-auto flex justify-between items-center">
          <span className="text-xl font-bold text-brand-primary">E-Sign UK</span>
          <AuthButton /> {/* Replace static links with the AuthButton component */}
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-grow container mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 text-gray-900">
          Secure &amp; Simple E-Signatures for the UK
        </h1>
        <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
          E-Sign UK provides a user-friendly platform for individuals and businesses to securely sign and manage documents online, fully compliant with UK regulations.
        </p>
        <Link
          href="/auth/register"
          className="inline-block rounded-md bg-brand-primary px-8 py-3 text-lg font-medium text-brand-white shadow-sm hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
        >
          Get Started for Free
        </Link>
      </main>

      {/* Features/How it Works Section */}
      <section className="bg-brand-white py-16 px-6">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">How E-Sign UK Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <DocumentPlusIcon className="h-12 w-12 text-brand-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">1. Upload Document</h3>
              <p className="text-gray-600">Easily upload your PDF documents directly to our secure platform.</p>
            </div>
            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <PencilSquareIcon className="h-12 w-12 text-brand-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">2. Prepare &amp; Send</h3>
              <p className="text-gray-600">Add signature fields, assign signers, and specify the signing order.</p>
            </div>
            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <PaperAirplaneIcon className="h-12 w-12 text-brand-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">3. Sign &amp; Manage</h3>
              <p className="text-gray-600">Signers receive secure links to sign, and you track progress on your dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="bg-brand-secondary/10 py-16 px-6"> {/* Using a light shade of secondary */}
        <div className="container mx-auto text-center">
           <LockClosedIcon className="h-12 w-12 text-brand-primary mb-4 mx-auto" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Trustworthy &amp; Secure</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            We prioritize your security. Documents are encrypted, access is controlled, and our processes align with UK e-signature standards (like eIDAS) to ensure legal admissibility. Your data is handled following GDPR principles.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full p-6 mt-auto bg-gray-100 text-center text-sm text-gray-600"> {/* Slightly lighter gray */}
        &amp;copy; {new Date().getFullYear()} E-Sign UK. All rights reserved.
        {/* TODO: Add links to Privacy Policy/Terms */}
        <div className="mt-2">
            <Link href="/privacy" className="hover:underline mx-2">Privacy Policy</Link> |
            <Link href="/terms" className="hover:underline mx-2">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}

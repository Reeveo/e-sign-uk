// src/app/page.tsx
import Link from 'next/link';
import AuthButton from '@/components/AuthButton';
import { LockClosedIcon, DocumentPlusIcon, PaperAirplaneIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-esign-background">
      {/* Header/Nav */}
      <header className="w-full p-4 bg-esign-card shadow-sm">
        <nav className="container mx-auto flex justify-between items-center">
          <span className="text-xl font-bold text-esign-primary-text">E-Sign UK</span>
          <AuthButton />
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-grow container mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 text-esign-primary-text">
          Secure &amp; Simple E-Signatures for the UK
        </h1>
        <p className="text-lg text-esign-secondary-text mb-10 max-w-2xl mx-auto">
          E-Sign UK provides a user-friendly platform for individuals and businesses to securely sign and manage documents online, fully compliant with UK regulations.
        </p>
        <Link
          href="/auth/register"
          className="esign-button-primary"
        >
          Get Started for Free
        </Link>
      </main>

      {/* Features/How it Works Section */}
      <section className="bg-esign-card py-16 px-6">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold text-esign-primary-text mb-12">How E-Sign UK Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <DocumentPlusIcon className="h-12 w-12 text-esign-primary-text mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-esign-primary-text">1. Upload Document</h3>
              <p className="text-esign-secondary-text">Easily upload your PDF documents directly to our secure platform.</p>
            </div>
            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <PencilSquareIcon className="h-12 w-12 text-esign-primary-text mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-esign-primary-text">2. Prepare &amp; Send</h3>
              <p className="text-esign-secondary-text">Add signature fields, assign signers, and specify the signing order.</p>
            </div>
            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <PaperAirplaneIcon className="h-12 w-12 text-esign-primary-text mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-esign-primary-text">3. Sign &amp; Manage</h3>
              <p className="text-esign-secondary-text">Signers receive secure links to sign, and you track progress on your dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="bg-esign-background py-16 px-6">
        <div className="container mx-auto text-center">
          <LockClosedIcon className="h-12 w-12 text-esign-primary-text mb-4 mx-auto" />
          <h2 className="text-3xl font-bold text-esign-primary-text mb-4">Trustworthy &amp; Secure</h2>
          <p className="text-lg text-esign-secondary-text max-w-3xl mx-auto">
            We prioritize your security. Documents are encrypted, access is controlled, and our processes align with UK e-signature standards (like eIDAS) to ensure legal admissibility. Your data is handled following GDPR principles.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full p-6 mt-auto bg-esign-card text-center text-sm text-esign-secondary-text">
        &copy; {new Date().getFullYear()} E-Sign UK. All rights reserved.
        <div className="mt-2">
          <Link href="/privacy" className="hover:underline mx-2 hover:text-esign-primary-text">Privacy Policy</Link> |
          <Link href="/terms" className="hover:underline mx-2 hover:text-esign-primary-text">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}

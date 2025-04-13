Okay, here is a Product Requirements Document (PRD) for your DocuSign clone, incorporating the details you've provided.

Product Requirements Document: UK E-Signature Platform (Project Codename: E-Sign UK)
1. Introduction
This document outlines the requirements for "E-Sign UK," a new web-based electronic signature platform targeted primarily at the UK market. E-Sign UK aims to provide a secure, user-friendly, and affordable alternative to existing solutions like DocuSign. It will allow users to upload documents, specify signing fields, manage a sequential signing process, and securely store executed documents. The platform will emphasize trust, simplicity, and compliance with relevant UK regulations.
2. Goals & Objectives
    • Primary Goal: Launch a Minimum Viable Product (MVP) of a secure and reliable e-signature platform enabling users to upload, send, sign, and manage documents electronically within the UK.
    • User Experience: Provide an exceptionally simple and intuitive user journey for both document creators and signers.
    • Trust & Security: Establish user trust through robust security measures, data encryption, and transparent practices.
    • Market Position: Offer a competitive free tier and a straightforward paid subscription model appealing to individuals and small businesses in the UK.
    • Technical: Deliver a performant and scalable application using the specified modern tech stack (React/Next.js/Supabase/Vercel).
3. Target Audience
    • Primary: UK-based Small to Medium Businesses (SMBs), freelancers, sole traders requiring legally acceptable electronic signatures for contracts, agreements, NDAs, etc.
    • Secondary: Individuals in the UK needing to sign personal documents (e.g., tenancy agreements, personal contracts).
4. Key Features (Functional Requirements)
4.1 User Management & Authentication
* FEAT-AUTH-01: Secure user registration (Email/Password).
* FEAT-AUTH-02: Secure user login.
* FEAT-AUTH-03: Password reset functionality.
* FEAT-AUTH-04: Integration with Supabase Auth for all authentication processes.
4.2 Document Management & Workflow
* FEAT-DOC-01: Users can upload their own documents (Initial focus: PDF format. Consider future expansion).
* FEAT-DOC-02: Document Preparation Interface:
* Display the uploaded document visually.
* Provide a palette of standard fields (e.g., Signature, Initials, Name, Date Signed, Date of Birth, Text Box).
* Allow users to drag and drop these fields onto the document preview.
* Allow users to assign specific fields to specific signers.
* FEAT-DOC-03: Signer & Recipient Management:
* Users can add one or more signers to a document.
* Users can specify the signing order (sequential workflow).
* Users can designate recipients who receive the final, fully executed document (can include signers and non-signers).
*
* **4.2.1 Document Add & Preparation Workflow (End-to-End)**
* This outlines the complete user journey from uploading a document to initiating the signing process:
* 1.  **Upload Document (Dashboard):** The user initiates the process by uploading a PDF document using the `DocumentUpload` component on their Dashboard (FEAT-DOC-01).
* 2.  **Initial Backend Processing:** Upon successful upload, the backend:
    *   Securely stores the PDF file in Supabase Storage.
    *   Creates a corresponding record in the `documents` table with an initial status (e.g., 'draft').
* 3.  **Frontend Update (Dashboard):** The Dashboard UI updates, typically showing the newly uploaded document in the `DocumentList` with a "Prepare" button or similar call to action.
* 4.  **Navigate to Preparation:** The user clicks the "Prepare" button, navigating them to the dedicated Document Preparation page (`/documents/[documentId]/prepare`).
* 5.  **Document Preparation Steps:** On the preparation page, the user configures the document for signing:
    *   **Add Signers:** Adds required signers (name, email) using the `SignerInput` panel (Part of FEAT-DOC-03).
    *   **Set Signing Order:** Defines the sequence in which signers must sign (Part of FEAT-DOC-03).
    *   **Place Fields:** Uses the `FieldPalette` and `DocumentPreparationArea` (including `PdfViewer`) to drag & drop fields (Signature, Date Signed, Text, etc.) onto the document (FEAT-DOC-02).
    *   **Assign Fields:** Selects each placed field and assigns it to a specific signer using the `FieldProperties` panel (FEAT-DOC-02).
* 6.  **Save Preparation ("Save & Continue"):** The user clicks "Save & Continue" (or a similar button) to finalize the preparation.
* 7.  **Backend Save Processing:** This action triggers a request to the backend API (`/api/documents/[documentId]/prepare`):
    *   The backend validates the preparation data (signers, fields, assignments).
    *   Persists the signers, their order, field details (type, position, page, assigned signer ID), and any other preparation settings to the database, associating them with the document record.
    *   Updates the document's status in the database to 'ready_to_send'.
* 8.  **Automatic Send Trigger:** The successful completion of the `/prepare` API call (or a separate mechanism triggered by the status change) automatically initiates the sending process by calling the `/api/documents/[documentId]/send` endpoint. This endpoint:
    *   Generates unique, secure signing tokens for each signer based on the defined order.
    *   Updates the signer records in the database with their respective tokens.
    *   Updates the document's status in the database to 'sent'.
    *   Logs the initial notification event (e.g., email sent to the first signer).
    *   Sends the actual email notification to the *first* signer in the sequence, containing their unique signing link (FEAT-DOC-04 Part 1 - Initiation).
* 9.  **Frontend Confirmation:** The user is typically redirected back to the Dashboard or shown a confirmation message indicating the document preparation is complete and the signing process has been initiated. The document status on the Dashboard should reflect 'sent'.
* FEAT-DOC-04: Sending & Notifications:
* Initiate the signing process, sending an email notification to the first signer in the sequence via Resend.
* Email should contain a secure, unique link to the signing page.
* Subsequent signers are notified via email only after the previous signer has completed their action.
* Upon completion by all signers, the final executed document is emailed (as a PDF attachment or secure link) to all designated recipients via Resend.
* Consider basic reminder notifications for pending signatures (future enhancement?).
4.3 Signing Process
* FEAT-SIGN-01: Secure Signing Page: Accessible via the unique link from the email. No login required for signers (unless they are also the document creator or an existing user).
* FEAT-SIGN-02: Guided Signing: Clearly indicate which fields the current signer needs to complete.
* FEAT-SIGN-03: Signature Capture:
* Allow users to draw their signature (mouse/touch).
* Allow users to type their name and select a generated font style.
* (Optional: Allow users to upload an image of their signature).
* FEAT-SIGN-04: Signature Application: Apply the captured signature/initials/data to the designated fields on the document.
* FEAT-SIGN-05: Consent: Include a clear checkbox or statement indicating the signer agrees to sign electronically.
* FEAT-SIGN-06: Completion: A clear "Finish" or "Complete Signing" action that locks their input and triggers the workflow for the next signer or final distribution.
4.4 User Dashboard
* FEAT-DASH-01: Logged-in users access a dashboard displaying all documents they have created or uploaded.
* FEAT-DASH-02: Document Listing: Show key information like document name, date created/sent, and current status.
* FEAT-DASH-03: Document Status Tracking: Clearly display the stage of each document (e.g., Draft, Sent, Waiting for [Signer Name], Completed, Declined).
* FEAT-DASH-04: Access to Documents: Allow users to view/download their completed documents. Allow viewing of documents in progress (read-only).
4.5 Signature Verification & Audit Trail
* FEAT-VERI-01: Basic Genuineness Verification: While true identity verification is complex, implement a robust audit trail for legal admissibility. Capture and securely store:
* Signer's email address (as provided by the sender).
* Timestamp of signing events (viewed, signed, completed).
* IP address of the signer.
* User Agent (browser/device information).
* FEAT-VERI-02: Audit Trail Certificate: Generate a summary or certificate appended to/associated with the final document, detailing the verification information (FEAT-VERI-01) for each signer.
4.6 Subscription & Billing
* FEAT-BILL-01: Free Tier: Automatically applied upon registration. Limit users to creating/sending 10 new documents per calendar month. Track usage against this limit.
* FEAT-BILL-02: Paywall: When a free-tier user attempts to send their 11th document in a month, present a paywall/upgrade prompt.
* FEAT-BILL-03: Paid Tier: A single, simple monthly subscription plan offering unlimited (or significantly higher limit) document sending.
* FEAT-BILL-04: Payment Integration: Integrate with a payment provider (see Section 6.7) to handle recurring monthly subscriptions. Securely manage payment details (likely via the provider's interface/tokenization).
* FEAT-BILL-05: Subscription Management: Allow users to view their current plan, billing history, and cancel their subscription.
5. Non-Functional Requirements
    • NFR-SEC-01: Security: 
        ○ Data Encryption: Encrypt sensitive data both in transit (TLS/SSL) and at rest (using Supabase's built-in database encryption and potentially application-level encryption for documents).
        ○ Secure Storage: Utilize Supabase Storage security rules to ensure only authorized users can access documents.
        ○ Access Control: Implement proper authorization checks for all actions (e.g., only the creator can modify a draft).
        ○ Dependency Security: Regularly scan dependencies for vulnerabilities.
        ○ Compliance: Adhere to UK GDPR principles for data handling and user rights.
    • NFR-PERF-01: Performance: 
        ○ Responsive UI: Fast load times and smooth interactions, leveraging Next.js SSR/ISR and Vercel's CDN.
        ○ Efficient Backend: Optimize database queries and serverless function execution times.
    • NFR-USE-01: Usability: 
        ○ Intuitive Navigation: Simple, clear site structure and workflow.
        ○ Minimal Clicks: Streamline common tasks like uploading and sending.
        ○ Clear Feedback: Provide immediate visual feedback for user actions (e.g., field placement, saving, sending).
    • NFR-REL-01: Reliability: 
        ○ High Uptime: Leverage Vercel's infrastructure for reliability.
        ○ Robust Error Handling: Gracefully handle potential errors (e.g., upload failure, email delivery issues, payment failures) with clear user messages.
        ○ Data Integrity: Ensure document and signature data is stored accurately and consistently.
    • NFR-COMP-01: Compliance (UK Specific): 
        ○ Ensure the signing process aligns with UK law regarding electronic signatures (e.g., eIDAS regulation as adopted/modified in the UK, Law Commission guidance on electronic execution of documents). The audit trail (FEAT-VERI-01, FEAT-VERI-02) is key here. Disclaimer: This PRD does not constitute legal advice. Consult with legal professionals specialising in UK e-signature law.
    • NFR-TEST-01: Testing: 
        ○ Unit Testing: Implement basic unit tests for critical components and utility functions (using Jest/React Testing Library or similar). Focus on core logic.
        ○ Integration Testing: Test interactions between frontend, backend API routes, and Supabase.
        ○ End-to-End Testing (Manual initially): Test the full user journeys (signup, upload, send, sign, complete).
6. Technical Specifications
    • 6.1 Frontend: React (using Next.js framework)
    • 6.2 Backend: Next.js (API Routes for backend logic)
    • 6.3 Database: Supabase Database (PostgreSQL)
    • 6.4 Authentication: Supabase Auth
    • 6.5 File Storage: Supabase Storage
    • 6.6 Deployment: Vercel
    • 6.7 Email Service: Resend (for transactional emails: invitations, completion notices)
    • 6.8 Styling: Tailwind CSS
    • 6.9 Local Development: Docker (configure docker-compose.yml to run Next.js app and potentially Supabase locally via its CLI/Docker image to mirror Vercel/Supabase cloud environment as closely as possible).
    • 6.10 Payment Integration: 
        ○ Stripe: Excellent developer documentation, robust APIs, well-suited for SaaS subscriptions, integrates well with React/Node.js, widely trusted, handles UK payments (GBP) and compliance (SCA). Supabase often has examples/guides for Stripe integration.
7. Design & UX Considerations
    • Simplicity: The core principle. Avoid clutter and unnecessary steps.
    • Trust Signals: Visibly incorporate security badges, clear links to Privacy Policy and Terms of Service. Use reassuring language around security.
    • Modern Aesthetic: Clean, professional look and feel using Tailwind CSS utility-first approach.
    • Responsiveness: Ensure seamless experience across desktop, tablet, and mobile devices.
    • Accessibility: Adhere to basic accessibility standards (WCAG AA where feasible).
    - Colour branding is in white with grey accents to make it a modern website with amazing UI and UX.
8. Release Criteria (MVP)
    • All features listed under Section 4 (Key Features) are implemented and tested.
    • Core non-functional requirements (Security basics, Usability, Reliability) are met.
    • Signing workflow is fully functional and reliable.
    • Free tier limit is enforced.
    • Basic payment integration allows users to subscribe to the paid tier.
    • Deployment to Vercel is successful.
    • Basic legal documentation (Privacy Policy, Terms of Service) is in place (requires legal review).
9. Future Considerations (Post-MVP)
    • Document Templates
    • Additional Field Types (Checkboxes, Radio Buttons, Dropdowns)
    • Bulk Sending
    • Team/Organisation Accounts
    • In-person Signing
    • API for Integrations
    • Advanced Reporting/Analytics
    • More Sophisticated Identity Verification options (if required)
    • Multiple Paid Tiers
10. Open Questions
    • Specific list of required standard fields beyond Name, DOB, Signature, Date Signed?
    • Detailed definition and pricing for the Paid Tier?
    • Specific requirements for signature "genuineness" beyond the proposed audit trail for MVP? Is the audit trail sufficient for the target legal requirements in the UK? (Requires legal consultation).
    • Supported document upload formats beyond PDF initially? (Recommend PDF only for MVP).
    • Specific error handling scenarios to define (e.g., Resend bounce handling).

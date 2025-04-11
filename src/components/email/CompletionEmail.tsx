import * as React from 'react';

interface CompletionEmailProps {
  documentName: string;
  signedDocumentUrl: string;
  auditCertificateUrl: string;
}

export const CompletionEmail: React.FC<Readonly<CompletionEmailProps>> = ({
  documentName,
  signedDocumentUrl,
  auditCertificateUrl,
}) => (
  <div>
    <h1>Document Signing Complete</h1>
    <p>The document "{documentName}" has been successfully signed by all parties.</p>
    <p>You can download the final documents using the links below:</p>
    <ul>
      <li><a href={signedDocumentUrl}>Download Signed Document</a></li>
      <li><a href={auditCertificateUrl}>Download Audit Certificate</a></li>
    </ul>
    <p>Thank you for using our service.</p>
  </div>
);

export default CompletionEmail;
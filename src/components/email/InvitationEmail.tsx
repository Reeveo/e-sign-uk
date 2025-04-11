import * as React from 'react';

interface InvitationEmailProps {
  signingUrl: string;
  documentName: string; // Optional: Add document name for context
  senderName?: string; // Optional: Name of the person who sent the document
}

export const InvitationEmail: React.FC<Readonly<InvitationEmailProps>> = ({
  signingUrl,
  documentName,
  senderName,
}) => (
  <div>
    <h1>You're Invited to Sign a Document</h1>
    {senderName && <p>{senderName} has invited you to sign the document: {documentName || 'Document'}.</p>}
    {!senderName && <p>You have been invited to sign the document: {documentName || 'Document'}.</p>}
    <p>Please click the link below to review and sign the document:</p>
    <a href={signingUrl}>Sign Document</a>
    <p>If you did not expect this email, please ignore it.</p>
  </div>
);

export default InvitationEmail;
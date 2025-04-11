import { Resend } from 'resend';
import * as React from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'; // Use environment variable or default

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  react?: React.ReactElement;
  html?: string;
  text?: string;
}

export async function sendEmail({ to, subject, react, html, text }: SendEmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set. Skipping email send.');
    // In a real app, you might want to throw an error or handle this differently
    return { data: null, error: new Error('Resend API Key not configured.') };
  }

  if (!react && !html && !text) {
    console.error('Email content (react, html, or text) is required.');
    return { data: null, error: new Error('Email content is required.') };
  }

  try {
    console.log(`Attempting to send email via Resend to: ${Array.isArray(to) ? to.join(', ') : to}`);
    console.log(`Subject: ${subject}`);
    const response = await resend.emails.send({
      from: fromEmail,
      to: to,
      subject: subject,
      react: react,
      html: html,
      text: text,
    });
    console.log('Resend API Response:', response);

    if (response.error) {
      console.error('Error sending email via Resend:', response.error);
      return { data: null, error: response.error };
    }

    return { data: response.data, error: null };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { data: null, error: error instanceof Error ? error : new Error('Unknown error sending email') };
  }
}
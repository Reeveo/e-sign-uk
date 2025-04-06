// src/app/dashboard/__tests__/page.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { redirect } from 'next/navigation';
import DashboardPage from '../page';
import { createClient } from '@/lib/supabase/server';

// Mock dependencies
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({ // Corrected path
  createClient: jest.fn(), // Corrected function name
}));

// Mock child components
jest.mock('@/components/DocumentUpload', () => () => <div data-testid="mock-document-upload">Mock Document Upload</div>);
jest.mock('@/components/DocumentList', () => () => <div data-testid="mock-document-list">Mock Document List</div>);

// Type assertions for the mocked functions
const mockedCreateClient = createClient as jest.Mock; // Corrected variable name and function
const mockedRedirect = redirect as unknown as jest.Mock; // Corrected type assertion

describe('DashboardPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should redirect to /auth/login if user is not authenticated', async () => {
    // Arrange: Mock Supabase client to return no user
    // Mock Supabase client to return no user and basic DB methods
    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      // Add basic mocks for DB methods even if not strictly needed for this test case
      // to prevent errors if the component logic changes slightly.
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }), // Return empty array by default
    });

   // Act: Execute the server component function.
   // For redirects, we don't render, just await the function's execution.
   // The redirect should happen during this execution.
   // We wrap in a try/catch because next/navigation's redirect throws a specific error.
   try {
     await DashboardPage();
   } catch (error: any) {
       // Check if the error is the specific NEXT_REDIRECT error
       // This is a bit brittle, relying on the internal error code.
       // A more robust check might involve inspecting the error object further if possible.
       if (error.digest !== 'NEXT_REDIRECT') {
           throw error; // Re-throw if it's not the redirect error
       }
   }

    // Assert: Check if redirect was called
    expect(mockedRedirect).toHaveBeenCalledTimes(1);
    expect(mockedRedirect).toHaveBeenCalledWith('/auth/login');
  });

  it('should render the dashboard and child components if user is authenticated', async () => {
    // Arrange: Mock Supabase client to return an authenticated user
    const mockUser = { id: 'test-user-id', email: 'test@example.com' };
    // Mock Supabase client to return user and successful (empty) document fetch
    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }), // Mock successful fetch returning no documents
    });

   // Act: Await the component promise and then render the result
    const PageComponent = await DashboardPage();
    render(PageComponent);

    // Assert: Check if redirect was NOT called
    expect(mockedRedirect).not.toHaveBeenCalled();

    // Assert: Check if main content and mocked components are rendered
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByTestId('mock-document-upload')).toBeInTheDocument();
    expect(screen.getByTestId('mock-document-list')).toBeInTheDocument();
  });
});
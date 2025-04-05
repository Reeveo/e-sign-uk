import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react'; // Import waitFor if needed for more complex scenarios, but findBy should suffice here
import Home from '../page'; // Adjust the import path as needed

// Ensure the manual mock for the Supabase client is used
jest.mock('@/lib/supabase/client');
// Mock next/link behavior for testing
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock next/navigation for useRouter used in AuthButton
const mockRouterPush = jest.fn();
const mockRouterRefresh = jest.fn(); // Add mock for refresh
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    refresh: mockRouterRefresh, // Provide the mock refresh function
  }),
}));

describe('Home Page', () => {
  // Keep using getByRole for static elements present on initial render
  it('renders the main heading', async () => { // Mark test as async if using findBy*
    render(<Home />);
    // Use a flexible matcher like text content or role
    // Heading is likely static, so getByRole might be okay, but findByRole is safer if AuthButton affects layout significantly
    const heading = await screen.findByRole('heading', {
      name: /Secure & Simple E-Signatures for the UK/i, // Corrected: Use '&' instead of '&amp;'
    });
    expect(heading).toBeInTheDocument();
  });

  it('renders the Login link', async () => { // Mark test as async
    render(<Home />);
    // Wait for the Login link to appear after AuthButton loads
    const loginLink = await screen.findByRole('link', { name: /Login/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/auth/login');
  });

  it('renders the Register link', async () => { // Mark test as async
    render(<Home />);
    // Find the specific register link (might need more specific query if multiple exist)
    // Wait for the Register links to appear
    const registerLinks = await screen.findAllByRole('link', { name: /Register/i });
    // Assuming the main register link is the one we want to test here
    const mainRegisterLink = registerLinks.find(link => link.getAttribute('href') === '/auth/register');
    expect(mainRegisterLink).toBeInTheDocument();
    expect(mainRegisterLink).toHaveAttribute('href', '/auth/register');
  });

   // Keep using getByRole for static elements present on initial render
   it('renders the Get Started link', () => {
    render(<Home />);
    const getStartedLink = screen.getByRole('link', { name: /Get Started for Free/i });
    expect(getStartedLink).toBeInTheDocument();
    expect(getStartedLink).toHaveAttribute('href', '/auth/register');
  });

});
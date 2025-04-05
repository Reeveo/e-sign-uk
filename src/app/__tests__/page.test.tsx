import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Home from '../page'; // Adjust the import path as needed

// Mock next/link behavior for testing
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('Home Page', () => {
  it('renders the main heading', () => {
    render(<Home />);
    // Use a flexible matcher like text content or role
    const heading = screen.getByRole('heading', {
      name: /Secure & Simple E-Signatures for the UK/i, // Corrected: Use '&' instead of '&amp;'
    });
    expect(heading).toBeInTheDocument();
  });

  it('renders the Login link', () => {
    render(<Home />);
    const loginLink = screen.getByRole('link', { name: /Login/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/auth/login');
  });

  it('renders the Register link', () => {
    render(<Home />);
    // Find the specific register link (might need more specific query if multiple exist)
    const registerLinks = screen.getAllByRole('link', { name: /Register/i });
    // Assuming the main register link is the one we want to test here
    const mainRegisterLink = registerLinks.find(link => link.getAttribute('href') === '/auth/register');
    expect(mainRegisterLink).toBeInTheDocument();
    expect(mainRegisterLink).toHaveAttribute('href', '/auth/register');
  });

   it('renders the Get Started link', () => {
    render(<Home />);
    const getStartedLink = screen.getByRole('link', { name: /Get Started for Free/i });
    expect(getStartedLink).toBeInTheDocument();
    expect(getStartedLink).toHaveAttribute('href', '/auth/register');
  });

});
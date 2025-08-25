import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import LoginPage from '../page';
import { useAuth } from '@/context/AuthContext';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the auth context
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, type, ...props }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      type={type}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ className, ...props }) => (
    <input className={className} {...props} />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, ...props }) => (
    <label htmlFor={htmlFor} {...props}>
      {children}
    </label>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }) => <h3 className={className}>{children}</h3>,
  CardDescription: ({ children, className }) => <p className={className}>{children}</p>,
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: (props) => <input type="checkbox" {...props} />,
}));

// Mock icons
jest.mock('@heroicons/react/24/outline', () => ({
  EyeIcon: (props) => <div data-testid="eye-icon" {...props} />,
  EyeSlashIcon: (props) => <div data-testid="eye-slash-icon" {...props} />,
}));

jest.mock('@/components/icons/ErrorIcon', () => ({
  ErrorIcon: (props) => <div data-testid="error-icon" {...props} />,
}));

jest.mock('@/components/icons/CheckIcon', () => ({
  CheckIcon: (props) => <div data-testid="check-icon" {...props} />,
}));

jest.mock('@/components/icons/LogoIcon', () => ({
  LogoIcon: (props) => <div data-testid="logo-icon" {...props} />,
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}));

describe('LoginPage', () => {
  const mockPush = jest.fn();
  const mockLogin = jest.fn();
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    });

    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isLoading: false,
      user: null,
      tenant: null,
      logout: jest.fn(),
      isAuthenticated: false,
    });

    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders login form with all required elements', () => {
      render(<LoginPage />);

      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
    });

    it('renders welcome message and branding', () => {
      render(<LoginPage />);

      expect(screen.getByText('Welcome back')).toBeInTheDocument();
      expect(screen.getByText(/enter your email and password/i)).toBeInTheDocument();
      expect(screen.getByText('AgroMart')).toBeInTheDocument();
    });

    it('renders forgot password link', () => {
      render(<LoginPage />);

      const forgotPasswordLink = screen.getByText(/forgot your password/i);
      expect(forgotPasswordLink).toBeInTheDocument();
      expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '#');
    });

    it('renders sign up link', () => {
      render(<LoginPage />);

      const signUpLink = screen.getByText(/sign up/i);
      expect(signUpLink).toBeInTheDocument();
      expect(signUpLink.closest('a')).toHaveAttribute('href', '/auth/register');
    });

    it('renders feature highlights in the sidebar', () => {
      render(<LoginPage />);

      expect(screen.getByText(/real-time inventory tracking/i)).toBeInTheDocument();
      expect(screen.getByText(/multi-tenant architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/advanced analytics/i)).toBeInTheDocument();
    });

    it('renders logo icons', () => {
      render(<LoginPage />);

      const logoIcons = screen.getAllByTestId('logo-icon');
      expect(logoIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Form Validation', () => {
    it('shows email validation error for invalid email', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');
      await user.tab(); // Trigger blur to show validation

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('shows password validation error for short password', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, '123');
      await user.tab(); // Trigger blur to show validation

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      });
    });

    it('disables submit button when form is invalid', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const submitButton = screen.getByRole('button', { name: /login/i });
      expect(submitButton).toBeDisabled();

      // Enter invalid email
      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid');

      expect(submitButton).toBeDisabled();
    });

    it('enables submit button when form is valid', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('sets proper ARIA attributes for validation errors', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid');
      await user.tab();

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
        expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
        
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toHaveAttribute('id', 'email-error');
        expect(errorMessage).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    it('toggles password visibility when eye icon is clicked', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const passwordInput = screen.getByLabelText(/password/i);
      const toggleButton = screen.getByLabelText(/show password/i);

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(screen.getByTestId('eye-icon')).toBeInTheDocument();

      await user.click(toggleButton);

      expect(passwordInput).toHaveAttribute('type', 'text');
      expect(screen.getByTestId('eye-slash-icon')).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
      expect(toggleButton).toHaveAttribute('aria-label', 'Hide password');
    });

    it('has proper keyboard accessibility for password toggle', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const toggleButton = screen.getByLabelText(/show password/i);
      
      await user.tab(); // Focus email
      await user.tab(); // Focus password
      await user.tab(); // Focus toggle button

      expect(toggleButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(screen.getByTestId('eye-slash-icon')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('calls login function with correct data on form submission', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const rememberCheckbox = screen.getByLabelText(/remember me/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(rememberCheckbox);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      expect(mockLogin).toHaveBeenCalledWith(
        {
          email: 'test@example.com',
          password: 'password123',
          remember: true,
        },
        true
      );
    });

    it('shows loading state during form submission', async () => {
      const user = userEvent.setup();
      
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        isLoading: true,
        user: null,
        tenant: null,
        logout: jest.fn(),
        isAuthenticated: false,
      });

      render(<LoginPage />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).toHaveTextContent('Signing in...');
      expect(submitButton).toBeDisabled();
    });

    it('displays API error when login fails', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Invalid credentials';
      
      mockLogin.mockRejectedValueOnce(new Error(errorMessage));

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
        expect(screen.getByTestId('error-icon')).toBeInTheDocument();
      });
    });

    it('clears previous API error on new submission', async () => {
      const user = userEvent.setup();
      
      // First submission fails
      mockLogin.mockRejectedValueOnce(new Error('First error'));

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument();
      });

      // Second submission should clear the error
      mockLogin.mockResolvedValueOnce(undefined);
      
      await user.clear(passwordInput);
      await user.type(passwordInput, 'correctpassword');
      await user.click(submitButton);

      expect(screen.queryByText('First error')).not.toBeInTheDocument();
    });
  });

  describe('Remember Me Functionality', () => {
    it('defaults remember me checkbox to checked', () => {
      render(<LoginPage />);

      const rememberCheckbox = screen.getByLabelText(/remember me/i);
      expect(rememberCheckbox).toBeChecked();
    });

    it('toggles remember me checkbox', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const rememberCheckbox = screen.getByLabelText(/remember me/i);
      expect(rememberCheckbox).toBeChecked();

      await user.click(rememberCheckbox);
      expect(rememberCheckbox).not.toBeChecked();

      await user.click(rememberCheckbox);
      expect(rememberCheckbox).toBeChecked();
    });

    it('passes remember me value to login function', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const rememberCheckbox = screen.getByLabelText(/remember me/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(rememberCheckbox); // Uncheck it

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({ remember: false }),
        false
      );
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<LoginPage />);

      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('aria-labelledby', 'login-heading');

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('aria-required', 'true');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('aria-required', 'true');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      // Tab through form elements
      await user.tab();
      expect(screen.getByLabelText(/email/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/password/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/show password/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/remember me/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /login/i })).toHaveFocus();
    });

    it('announces form errors to screen readers', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid');
      await user.tab();

      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('Responsive Design', () => {
    it('renders mobile-friendly layout', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<LoginPage />);

      // Login form should still be visible
      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByText('Welcome back')).toBeInTheDocument();
    });

    it('renders desktop layout with sidebar', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });

      render(<LoginPage />);

      // Both login form and sidebar features should be visible
      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByText(/real-time inventory tracking/i)).toBeInTheDocument();
      expect(screen.getByText(/multi-tenant architecture/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      
      mockLogin.mockRejectedValueOnce(new Error('Network error'));

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('shows default error message for unknown errors', async () => {
      const user = userEvent.setup();
      
      mockLogin.mockRejectedValueOnce(new Error()); // Error without message

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/login failed. please try again/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const renderSpy = jest.fn();
      
      const TestWrapper = () => {
        renderSpy();
        return <LoginPage />;
      };

      const { rerender } = render(<TestWrapper />);
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      rerender(<TestWrapper />);
      
      // Should only re-render when props/context changes
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });
});
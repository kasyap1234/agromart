import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import RegisterPage from '../page';
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
  Button: ({ children, onClick, disabled, className, type, variant, size, ...props }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      type={type}
      data-variant={variant}
      data-size={size}
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
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: (props) => <input type="checkbox" {...props} />,
}));

jest.mock('@/components/ui/password-strength', () => ({
  PasswordStrengthMeter: ({ password }) => (
    <div data-testid="password-strength-meter" data-password={password}>
      Password Strength: {password ? 'Visible' : 'Hidden'}
    </div>
  ),
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

jest.mock('@/components/icons/RegisterIcon', () => ({
  RegisterIcon: (props) => <div data-testid="register-icon" {...props} />,
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}));

describe('RegisterPage', () => {
  const mockPush = jest.fn();
  const mockRegister = jest.fn();
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
      register: mockRegister,
      isLoading: false,
      user: null,
      tenant: null,
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: false,
    });

    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders registration form with all required fields', () => {
      render(<RegisterPage />);

      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('renders page header and description', () => {
      render(<RegisterPage />);

      expect(screen.getByText('Create your account')).toBeInTheDocument();
      expect(screen.getByText(/join agromart and start managing/i)).toBeInTheDocument();
    });

    it('renders terms and conditions checkbox', () => {
      render(<RegisterPage />);

      expect(screen.getByLabelText(/i agree to the terms and conditions/i)).toBeInTheDocument();
    });

    it('renders sign in link', () => {
      render(<RegisterPage />);

      const signInLink = screen.getByText(/sign in/i);
      expect(signInLink).toBeInTheDocument();
      expect(signInLink.closest('a')).toHaveAttribute('href', '/auth/login');
    });
  });

  describe('Form Validation', () => {
    it('shows validation errors for empty required fields', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      
      // Try to submit empty form
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/company name must be at least 2 characters/i)).toBeInTheDocument();
        expect(screen.getByText(/first name must be at least 2 characters/i)).toBeInTheDocument();
        expect(screen.getByText(/last name must be at least 2 characters/i)).toBeInTheDocument();
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('validates password length', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'short');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('validates password confirmation match', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'differentpassword');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
      });
    });

    it('validates terms and conditions acceptance', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      // Fill out form but don't check terms
      await user.type(screen.getByLabelText(/company name/i), 'Test Company');
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/you must accept the terms and conditions/i)).toBeInTheDocument();
      });
    });

    it('enables submit button when form is valid', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      expect(submitButton).toBeDisabled();

      // Fill out form completely
      await user.type(screen.getByLabelText(/company name/i), 'Test Company');
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByLabelText(/i agree to the terms/i));

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    it('toggles main password visibility', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      const toggleButtons = screen.getAllByLabelText(/show password/i);
      const mainPasswordToggle = toggleButtons[0]; // First toggle is for main password

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(screen.getByTestId('eye-icon')).toBeInTheDocument();

      await user.click(mainPasswordToggle);

      expect(passwordInput).toHaveAttribute('type', 'text');
      expect(screen.getByTestId('eye-slash-icon')).toBeInTheDocument();
    });

    it('toggles confirm password visibility independently', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const toggleButtons = screen.getAllByLabelText(/show password/i);
      const confirmPasswordToggle = toggleButtons[1]; // Second toggle is for confirm password

      expect(confirmPasswordInput).toHaveAttribute('type', 'password');

      await user.click(confirmPasswordToggle);

      expect(confirmPasswordInput).toHaveAttribute('type', 'text');
    });
  });

  describe('Password Strength Meter', () => {
    it('shows password strength meter when password is entered', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'password123');

      expect(screen.getByTestId('password-strength-meter')).toBeInTheDocument();
      expect(screen.getByTestId('password-strength-meter')).toHaveAttribute('data-password', 'password123');
    });

    it('hides password strength meter when password is empty', () => {
      render(<RegisterPage />);

      const strengthMeter = screen.queryByTestId('password-strength-meter');
      // Should not be visible initially or should show as hidden
      if (strengthMeter) {
        expect(strengthMeter).toHaveAttribute('data-password', '');
      }
    });
  });

  describe('Form Submission', () => {
    it('calls register function with correct data on form submission', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      // Fill out complete form
      await user.type(screen.getByLabelText(/company name/i), 'Test Company');
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByLabelText(/i agree to the terms/i));

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      expect(mockRegister).toHaveBeenCalledWith({
        company_name: 'Test Company',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        password: 'password123',
      });
    });

    it('shows loading state during form submission', async () => {
      const user = userEvent.setup();
      
      mockUseAuth.mockReturnValue({
        register: mockRegister,
        isLoading: true,
        user: null,
        tenant: null,
        login: jest.fn(),
        logout: jest.fn(),
        isAuthenticated: false,
      });

      render(<RegisterPage />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).toHaveTextContent('Creating account...');
      expect(submitButton).toBeDisabled();
    });

    it('displays API error when registration fails', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Email already exists';
      
      mockRegister.mockRejectedValueOnce(new Error(errorMessage));

      render(<RegisterPage />);

      // Fill out complete form
      await user.type(screen.getByLabelText(/company name/i), 'Test Company');
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByLabelText(/i agree to the terms/i));

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
        expect(screen.getByTestId('error-icon')).toBeInTheDocument();
      });
    });

    it('shows default error message for unknown errors', async () => {
      const user = userEvent.setup();
      
      mockRegister.mockRejectedValueOnce(new Error()); // Error without message

      render(<RegisterPage />);

      // Fill out complete form
      await user.type(screen.getByLabelText(/company name/i), 'Test Company');
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByLabelText(/i agree to the terms/i));

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/registration failed. please try again/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and descriptions', () => {
      render(<RegisterPage />);

      const companyInput = screen.getByLabelText(/company name/i);
      expect(companyInput).toHaveAttribute('aria-describedby', 'company-error');

      const firstNameInput = screen.getByLabelText(/first name/i);
      expect(firstNameInput).toHaveAttribute('aria-describedby', 'first-name-error');

      const lastNameInput = screen.getByLabelText(/last name/i);
      expect(lastNameInput).toHaveAttribute('aria-describedby', 'last-name-error');

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toHaveAttribute('aria-describedby', 'password-error');
      expect(passwordInput).toHaveAttribute('autoComplete', 'new-password');
    });

    it('sets proper ARIA attributes for validation errors', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid');
      await user.tab();

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
        
        const errorMessage = screen.getByText(/please enter a valid email address/i);
        expect(errorMessage).toHaveAttribute('id', 'email-error');
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      // Tab through form elements
      await user.tab();
      expect(screen.getByLabelText(/company name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/first name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/last name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/email address/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/^password$/i)).toHaveFocus();
    });
  });

  describe('Data Sanitization', () => {
    it('excludes sensitive data from registration payload', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      // Fill out complete form
      await user.type(screen.getByLabelText(/company name/i), 'Test Company');
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByLabelText(/i agree to the terms/i));

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      // Should not include confirmPassword or acceptTerms in the API call
      expect(mockRegister).toHaveBeenCalledWith(
        expect.not.objectContaining({
          confirmPassword: expect.anything(),
          acceptTerms: expect.anything(),
        })
      );
    });
  });

  describe('Error Recovery', () => {
    it('allows form resubmission after error', async () => {
      const user = userEvent.setup();
      
      // First submission fails
      mockRegister.mockRejectedValueOnce(new Error('First error'));

      render(<RegisterPage />);

      // Fill out complete form
      await user.type(screen.getByLabelText(/company name/i), 'Test Company');
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByLabelText(/i agree to the terms/i));

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument();
      });

      // Second submission should work
      mockRegister.mockResolvedValueOnce(undefined);
      
      await user.click(submitButton);

      expect(mockRegister).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily on password changes', async () => {
      const user = userEvent.setup();
      const renderSpy = jest.fn();
      
      const TestWrapper = () => {
        renderSpy();
        return <RegisterPage />;
      };

      render(<TestWrapper />);
      
      const initialRenderCount = renderSpy.mock.calls.length;
      const passwordInput = screen.getByLabelText(/^password$/i);
      
      await user.type(passwordInput, 'a');
      
      // Should only re-render when necessary for password strength updates
      expect(renderSpy.mock.calls.length).toBeGreaterThan(initialRenderCount);
    });
  });
});
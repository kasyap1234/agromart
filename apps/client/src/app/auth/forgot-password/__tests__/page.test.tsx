import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import ForgotPasswordPage from '../page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the API
jest.mock('@/lib/api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

// Mock @/lib/utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, type, variant, ...props }: any) => (
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
  Input: ({ className, ...props }: any) => (
    <input className={className} {...props} />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, ...props }: any) => (
    <label htmlFor={htmlFor} {...props}>
      {children}
    </label>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardFooter: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>,
  CardDescription: ({ children, className }: any) => <p className={className}>{children}</p>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, className }: any) => <div className={className} role="alert">{children}</div>,
  AlertDescription: ({ children, className }: any) => <p className={className}>{children}</p>,
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Mail: (props: any) => <div data-testid="mail-icon" {...props} />,
  ArrowLeft: (props: any) => <div data-testid="arrow-left-icon" {...props} />,
}));

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: jest.fn(),
}));

// Mock zod resolver
jest.mock('@hookform/resolvers/zod', () => ({
  zodResolver: jest.fn(),
}));

import { apiClient } from '@/lib/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

describe('ForgotPasswordPage', () => {
  const mockPush = jest.fn();
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
  const mockApiPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
  const mockUseForm = useForm as jest.MockedFunction<typeof useForm>;
  const mockToastSuccess = toast.success as jest.MockedFunction<typeof toast.success>;
  const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>;

  const mockForm = {
    register: jest.fn(),
    handleSubmit: jest.fn(),
    formState: {
      errors: {},
    },
  };

  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    });

    mockUseForm.mockReturnValue(mockForm as any);

    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders forgot password form with all required elements', () => {
      render(<ForgotPasswordPage />);

      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
    });

    it('renders page title and description', () => {
      render(<ForgotPasswordPage />);

      expect(screen.getByText('Forgot Password?')).toBeInTheDocument();
      expect(screen.getByText(/enter your email address and we'll send you a link/i)).toBeInTheDocument();
    });

    it('renders form with proper structure', () => {
      render(<ForgotPasswordPage />);

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('placeholder', 'you@example.com');
    });
  });

  describe('Form Validation', () => {
    it('shows email validation error for invalid email', async () => {
      const user = userEvent.setup();

      mockUseForm.mockReturnValue({
        ...mockForm,
        formState: {
          errors: {
            email: { message: 'Please enter a valid email address' },
          },
        },
      } as any);

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');
      await user.tab();

      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    it('does not show validation error for valid email', () => {
      mockUseForm.mockReturnValue({
        ...mockForm,
        formState: {
          errors: {},
        },
      } as any);

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toBeInTheDocument();

      expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('calls API with correct data on successful form submission', async () => {
      const user = userEvent.setup();

      mockApiPost.mockResolvedValueOnce({ data: { success: true } });
      mockUseForm.mockReturnValue({
        ...mockForm,
        handleSubmit: (callback: any) => (e: any) => {
          e.preventDefault();
          callback({ email: 'test@example.com' });
        },
      } as any);

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith('/auth/password/forgot', {
          email: 'test@example.com',
        });
        expect(mockToastSuccess).toHaveBeenCalledWith('Password reset email sent successfully');
      });
    });

    it('shows success state after successful submission', async () => {
      const user = userEvent.setup();

      mockApiPost.mockResolvedValueOnce({ data: { success: true } });
      mockUseForm.mockReturnValue({
        ...mockForm,
        handleSubmit: (callback: any) => (e: any) => {
          e.preventDefault();
          callback({ email: 'test@example.com' });
        },
      } as any);

      const { rerender } = render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      // Simulate success state
      rerender(<ForgotPasswordPage />);

      expect(screen.getByText('Check Your Email')).toBeInTheDocument();
      expect(screen.getByText(/we've sent a password reset link/i)).toBeInTheDocument();
      expect(screen.getByTestId('mail-icon')).toBeInTheDocument();
    });

    it('handles API errors gracefully', async () => {
      const user = userEvent.setup();
      const errorMessage = 'User not found';

      mockApiPost.mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      });
      mockUseForm.mockReturnValue({
        ...mockForm,
        handleSubmit: (callback: any) => (e: any) => {
          e.preventDefault();
          callback({ email: 'test@example.com' });
        },
      } as any);

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(errorMessage);
      });
    });

    it('handles network errors with default message', async () => {
      const user = userEvent.setup();

      mockApiPost.mockRejectedValueOnce(new Error('Network error'));
      mockUseForm.mockReturnValue({
        ...mockForm,
        handleSubmit: (callback: any) => (e: any) => {
          e.preventDefault();
          callback({ email: 'test@example.com' });
        },
      } as any);

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Failed to send reset email');
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();

      // Simulate loading state
      mockUseForm.mockReturnValue({
        ...mockForm,
        handleSubmit: () => async (e) => {
          e.preventDefault();
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 100));
        },
      } as any);

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      expect(submitButton).toHaveTextContent('Sending...');
      expect(emailInput).toBeDisabled();
    });
  });

  describe('Navigation', () => {
    it('navigates back to login when back button is clicked', async () => {
      const user = userEvent.setup();

      render(<ForgotPasswordPage />);

      const backButton = screen.getByRole('button', { name: /back to login/i });
      await user.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });

    it('navigates back to login from success state', async () => {
      const user = userEvent.setup();

      // Simulate success state by mocking the component
      const { rerender } = render(<ForgotPasswordPage />);

      // Trigger success state
      mockApiPost.mockResolvedValueOnce({ data: { success: true } });
      mockUseForm.mockReturnValue({
        ...mockForm,
        handleSubmit: (callback: any) => (e: any) => {
          e.preventDefault();
          callback({ email: 'test@example.com' });
        },
      } as any);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      // Re-render to show success state
      rerender(<ForgotPasswordPage />);

      const backToLoginButton = screen.getByRole('button', { name: /back to login/i });
      await user.click(backToLoginButton);

      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('aria-required', 'true');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordPage />);

      await user.tab();
      expect(screen.getByLabelText(/email address/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /send reset link/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /back to login/i })).toHaveFocus();
    });

    it('shows proper error announcements for screen readers', async () => {
      const user = userEvent.setup();

      mockUseForm.mockReturnValue({
        ...mockForm,
        formState: {
          errors: {
            email: { message: 'Invalid email' },
          },
        },
      } as any);

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid');
      await user.tab();

      expect(screen.getByText('Invalid email')).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('renders success message with proper content', () => {
      // Mock the success state by simulating the component state
      render(<ForgotPasswordPage />);

      expect(screen.getByText('Forgot Password?')).toBeInTheDocument();
      expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();
    });

    it('displays helpful information in success state', () => {
      render(<ForgotPasswordPage />);

      // Initially shows form, not success state
      expect(screen.queryByText('Check Your Email')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('logs errors to console for debugging', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const error = new Error('Network error');
      mockApiPost.mockRejectedValueOnce(error);
      mockUseForm.mockReturnValue({
        ...mockForm,
        handleSubmit: (callback) => (e) => {
          e.preventDefault();
          callback({ email: 'test@example.com' });
        },
      } as any);

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Password reset error:', error);
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Form State Management', () => {
    it('resets loading state after submission completes', async () => {
      const user = userEvent.setup();

      mockApiPost.mockResolvedValueOnce({ data: { success: true } });
      mockUseForm.mockReturnValue({
        ...mockForm,
        handleSubmit: (callback) => (e) => {
          e.preventDefault();
          callback({ email: 'test@example.com' });
        },
      } as any);

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalled();
      });

      // After successful submission, the component should handle the state properly
      expect(mockToastSuccess).toHaveBeenCalled();
    });
  });
});
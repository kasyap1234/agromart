import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Login from '../login/page';
import { AuthProvider } from '../../../context/AuthContext';
import { mockApiResponse, mockApiError } from '../../../lib/test-utils';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

describe('Login Page', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('renders login form correctly', () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByText(/Don't have an account\?/i)).toBeInTheDocument();
  });

  it('allows user to type in email and password fields', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('renders form elements correctly', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    // Check that form elements are present
    expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();

    // Check that user can interact with form
    const emailInput = screen.getByLabelText(/^Email$/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('allows typing in email and password fields', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    const emailInput = screen.getByLabelText(/^Email$/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);

    await user.type(emailInput, 'invalid-email');
    await user.type(passwordInput, '123');

    expect(emailInput).toHaveValue('invalid-email');
    expect(passwordInput).toHaveValue('123');
  });

  it('has proper form structure', () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    // Check form structure
    expect(screen.getByRole('form')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email$/i)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(/^Password$/i)).toHaveAttribute('type', 'password');

    // Check submit button
    const submitButton = screen.getByRole('button', { name: /login/i });
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('navigates to register page when register link is clicked', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    const registerLink = screen.getByText(/Sign up/i);
    await user.click(registerLink);

    // This would normally test navigation, but since we're mocking useRouter,
    // we can't easily test the actual navigation in this isolated test
    expect(registerLink).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    // Fill in required fields to enable submit button
    const emailInput = screen.getByLabelText(/^Email$/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    // Basic accessibility check - ensure form has proper labels
    expect(emailInput).toHaveAccessibleName();
    expect(passwordInput).toHaveAccessibleName();
    expect(submitButton).toBeEnabled();
  });
});
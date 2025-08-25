import { test, expect, describe, beforeEach, afterEach, mock } from 'bun:test';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AuthProvider, useAuth, usePermissions } from '../AuthContext';

// Mock dependencies
const mockPush = mock();
const mockReplace = mock();

mock.module('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mock(),
    forward: mock(),
    refresh: mock(),
    prefetch: mock(),
  }),
}));

const mockToast = {
  success: mock(),
  error: mock(),
};

mock.module('react-hot-toast', () => ({
  toast: mockToast,
}));

const mockApiClient = {
  auth: {
    login: mock(),
    register: mock(),
    logout: mock(),
    refreshToken: mock(),
    me: mock(),
  },
};

const mockSetAuthToken = mock();
const mockGetAuthToken = mock();
const mockClearTokens = mock();
const mockSetRefreshToken = mock();
const mockGetRefreshToken = mock();

mock.module('@/lib/api', () => ({
  apiClient: mockApiClient,
  setAuthToken: mockSetAuthToken,
  getAuthToken: mockGetAuthToken,
  clearTokens: mockClearTokens,
  setRefreshToken: mockSetRefreshToken,
  getRefreshToken: mockGetRefreshToken,
}));

// Test component to use the auth context
function TestComponent() {
  const { isAuthenticated, user, login, logout, register, isLoading } = useAuth();
  
  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'authenticated' : 'not-authenticated'}
      </div>
      <div data-testid="loading-status">
        {isLoading ? 'loading' : 'not-loading'}
      </div>
      <div data-testid="user-data">
        {user ? JSON.stringify(user) : 'no-user'}
      </div>
      <button 
        data-testid="login-btn"
        onClick={() => login({ email: 'test@example.com', password: 'password' })}
      >
        Login
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
      <button 
        data-testid="register-btn"
        onClick={() => register({ 
          name: 'Test User',
          email: 'test@example.com', 
          password: 'password',
          tenant_name: 'Test Tenant'
        })}
      >
        Register
      </button>
    </div>
  );
}

// Test component for permissions
function PermissionsTestComponent() {
  const permissions = usePermissions();
  
  return (
    <div>
      <div data-testid="is-admin">{permissions.isAdmin ? 'true' : 'false'}</div>
      <div data-testid="is-manager">{permissions.isManager ? 'true' : 'false'}</div>
      <div data-testid="is-user">{permissions.isUser ? 'true' : 'false'}</div>
      <div data-testid="can-manage-users">{permissions.canManageUsers ? 'true' : 'false'}</div>
      <div data-testid="can-view-products">{permissions.canViewProducts ? 'true' : 'false'}</div>
    </div>
  );
}

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    // Reset all mocks
    mockPush.mockClear();
    mockToast.success.mockClear();
    mockToast.error.mockClear();
    mockApiClient.auth.login.mockClear();
    mockApiClient.auth.register.mockClear();
    mockApiClient.auth.logout.mockClear();
    mockApiClient.auth.refreshToken.mockClear();
    mockApiClient.auth.me.mockClear();
    mockSetAuthToken.mockClear();
    mockGetAuthToken.mockClear();
    mockClearTokens.mockClear();
    mockSetRefreshToken.mockClear();
    mockGetRefreshToken.mockClear();
    
    // Mock return values
    mockGetAuthToken.mockReturnValue(null);
    mockGetRefreshToken.mockReturnValue(null);
  });

  afterEach(() => {
    // Clean up timers and listeners
    // Clear all mock calls
    mockPush.mockClear();
    mockToast.success.mockClear();
    mockToast.error.mockClear();
    mockApiClient.auth.login.mockClear();
    mockApiClient.auth.register.mockClear();
    mockApiClient.auth.logout.mockClear();
    mockApiClient.auth.refreshToken.mockClear();
    mockApiClient.auth.me.mockClear();
  });

  describe('Initial State', () => {
    test('starts with unauthenticated state when no token exists', async () => {
      mockGetAuthToken.mockReturnValue(null);
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
        expect(screen.getByTestId('loading-status')).toHaveTextContent('not-loading');
        expect(screen.getByTestId('user-data')).toHaveTextContent('no-user');
      });
    });

    test('loads user when valid token exists', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'user' };
      
      mockGetAuthToken.mockReturnValue('valid-token');
      mockApiClient.auth.me.mockResolvedValue({
        success: true,
        data: mockUser
      });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('user-data')).toHaveTextContent(JSON.stringify(mockUser));
      });

      expect(mockSetAuthToken).toHaveBeenCalledWith('valid-token');
      expect(mockApiClient.auth.me).toHaveBeenCalled();
    });

    test('clears tokens when token is invalid', async () => {
      mockGetAuthToken.mockReturnValue('invalid-token');
      mockApiClient.auth.me.mockRejectedValue(new Error('Invalid token'));

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      });

      expect(mockClearTokens).toHaveBeenCalled();
    });
  });

  describe('Login', () => {
    test('successful login updates state and redirects', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'user' };
      const mockResponse = {
        success: true,
        data: {
          token: 'new-token',
          refresh_token: 'refresh-token',
          user: mockUser
        }
      };

      mockApiClient.auth.login.mockResolvedValue(mockResponse);

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      const loginBtn = screen.getByTestId('login-btn');
      await userEvent.click(loginBtn);

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('user-data')).toHaveTextContent(JSON.stringify(mockUser));
      });

      expect(mockApiClient.auth.login).toHaveBeenCalledWith('test@example.com', 'password');
      expect(mockSetAuthToken).toHaveBeenCalledWith('new-token');
      expect(mockToast.success).toHaveBeenCalledWith('Login successful!');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    test('failed login shows error', async () => {
      mockApiClient.auth.login.mockRejectedValue(new Error('Invalid credentials'));

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      const loginBtn = screen.getByTestId('login-btn');
      await userEvent.click(loginBtn);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Invalid credentials');
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      });
    });

    test('login with remember me stores refresh token', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'user' };
      const mockResponse = {
        success: true,
        data: {
          token: 'new-token',
          refresh_token: 'refresh-token',
          user: mockUser
        }
      };

      mockApiClient.auth.login.mockResolvedValue(mockResponse);

      function TestLoginRemember() {
        const { login } = useAuth();
        
        return (
          <button 
            data-testid="login-remember-btn"
            onClick={() => login({ email: 'test@example.com', password: 'password' }, true)}
          >
            Login Remember
          </button>
        );
      }

      render(
        <TestWrapper>
          <TestLoginRemember />
        </TestWrapper>
      );

      const loginBtn = screen.getByTestId('login-remember-btn');
      await userEvent.click(loginBtn);

      await waitFor(() => {
        expect(mockSetRefreshToken).toHaveBeenCalledWith('refresh-token');
      });
    });
  });

  describe('Register', () => {
    test('successful registration updates state and redirects', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'user' };
      const mockResponse = {
        success: true,
        data: {
          token: 'new-token',
          refresh_token: 'refresh-token',
          user: mockUser
        }
      };

      mockApiClient.auth.register.mockResolvedValue(mockResponse);

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      const registerBtn = screen.getByTestId('register-btn');
      await userEvent.click(registerBtn);

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('user-data')).toHaveTextContent(JSON.stringify(mockUser));
      });

      expect(mockApiClient.auth.register).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
        tenant_name: 'Test Tenant'
      });
      expect(mockSetAuthToken).toHaveBeenCalledWith('new-token');
      expect(mockToast.success).toHaveBeenCalledWith('Registration successful!');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    test('failed registration shows error', async () => {
      mockApiClient.auth.register.mockRejectedValue(new Error('Email already exists'));

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      const registerBtn = screen.getByTestId('register-btn');
      await userEvent.click(registerBtn);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Email already exists');
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      });
    });
  });

  describe('Logout', () => {
    test('logout clears state and redirects', async () => {
      // Set up authenticated state
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'user' };
      mockGetAuthToken.mockReturnValue('token');
      mockApiClient.auth.me.mockResolvedValue({
        success: true,
        data: mockUser
      });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for authentication
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // Logout
      const logoutBtn = screen.getByTestId('logout-btn');
      await userEvent.click(logoutBtn);

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
        expect(screen.getByTestId('user-data')).toHaveTextContent('no-user');
      });

      expect(mockClearTokens).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Logged out successfully');
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });

    test('logout works even if API call fails', async () => {
      mockApiClient.auth.logout.mockRejectedValue(new Error('API Error'));

      // Set up authenticated state
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'user' };
      mockGetAuthToken.mockReturnValue('token');
      mockApiClient.auth.me.mockResolvedValue({
        success: true,
        data: mockUser
      });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for authentication
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // Logout
      const logoutBtn = screen.getByTestId('logout-btn');
      await userEvent.click(logoutBtn);

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      });

      expect(mockClearTokens).toHaveBeenCalled();
    });
  });

  describe('useAuth hook error handling', () => {
    test('throws error when used outside AuthProvider', () => {
      // Expect the error to be thrown
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');
    });
  });
});

describe('usePermissions', () => {
  function renderWithUser(user: any) {
    mockGetAuthToken.mockReturnValue('token');
    mockApiClient.auth.me.mockResolvedValue({
      success: true,
      data: user
    });

    return render(
      <TestWrapper>
        <PermissionsTestComponent />
      </TestWrapper>
    );
  }

  test('admin user has all permissions', async () => {
    const adminUser = { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin' };
    
    renderWithUser(adminUser);

    await waitFor(() => {
      expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
      expect(screen.getByTestId('is-manager')).toHaveTextContent('false');
      expect(screen.getByTestId('is-user')).toHaveTextContent('false');
      expect(screen.getByTestId('can-manage-users')).toHaveTextContent('true');
      expect(screen.getByTestId('can-view-products')).toHaveTextContent('true');
    });
  });

  test('manager user has limited permissions', async () => {
    const managerUser = { id: 1, name: 'Manager', email: 'manager@test.com', role: 'manager' };
    
    renderWithUser(managerUser);

    await waitFor(() => {
      expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
      expect(screen.getByTestId('is-manager')).toHaveTextContent('true');
      expect(screen.getByTestId('is-user')).toHaveTextContent('false');
      expect(screen.getByTestId('can-manage-users')).toHaveTextContent('false');
      expect(screen.getByTestId('can-view-products')).toHaveTextContent('true');
    });
  });

  test('regular user has basic permissions', async () => {
    const regularUser = { id: 1, name: 'User', email: 'user@test.com', role: 'user' };
    
    renderWithUser(regularUser);

    await waitFor(() => {
      expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
      expect(screen.getByTestId('is-manager')).toHaveTextContent('false');
      expect(screen.getByTestId('is-user')).toHaveTextContent('true');
      expect(screen.getByTestId('can-manage-users')).toHaveTextContent('false');
      expect(screen.getByTestId('can-view-products')).toHaveTextContent('true');
    });
  });

  test('handles case-insensitive roles', async () => {
    const userWithUppercaseRole = { id: 1, name: 'Admin', email: 'admin@test.com', role: 'ADMIN' };
    
    renderWithUser(userWithUppercaseRole);

    await waitFor(() => {
      expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
    });
  });

  test('handles no user (unauthenticated)', async () => {
    mockGetAuthToken.mockReturnValue(null);

    render(
      <TestWrapper>
        <PermissionsTestComponent />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
      expect(screen.getByTestId('is-manager')).toHaveTextContent('false');
      expect(screen.getByTestId('is-user')).toHaveTextContent('false');
      expect(screen.getByTestId('can-manage-users')).toHaveTextContent('false');
      expect(screen.getByTestId('can-view-products')).toHaveTextContent('true'); // All users can view products
    });
  });
});
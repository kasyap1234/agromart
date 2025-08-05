/**
 * Auth pages smoke tests to ensure pages render.
 */
import { render } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('Auth pages', () => {
  it('login page renders', async () => {
    const Login = (await import('../src/app/auth/login/page')).default;
    const { getByText } = render(<Login />);
    expect(getByText(/login/i)).toBeTruthy();
  });
  it('register page renders', async () => {
    const Register = (await import('../src/app/auth/register/page')).default;
    const { getByText } = render(<Register />);
    expect(getByText(/register/i)).toBeTruthy();
  });
});

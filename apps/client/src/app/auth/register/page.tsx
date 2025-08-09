'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { RegisterRequest } from '@/types';
import { PasswordStrengthMeter } from '@/components/ui/password-strength';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const registerSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  company_name: z.string().min(2, 'Company name must be at least 2 characters'),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { register: registerUser, isLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isValid },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const { confirmPassword, acceptTerms, ...registerData } = data;
      await registerUser(registerData);
    } catch (error) {
      // Error is handled in the AuthContext
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Registration form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-neutral-900">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Join AgroMart and start managing your inventory professionally
            </p>
          </div>

          <div className="mt-8">
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {/* Company Information */}
              {/* API Error Message */}
              {apiError && (
                <Card className="border-destructive bg-destructive/10">
                  <CardContent className="flex items-start space-x-2 p-4">
                    <svg className="h-5 w-5 text-destructive mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm font-medium text-destructive">{apiError}</p>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  {...register('company_name')}
                  id="company_name"
                  type="text"
                  className={cn(errors.company_name && "border-destructive focus-visible:ring-destructive")}
                  placeholder="Enter your company name"
                  aria-invalid={errors.company_name ? "true" : "false"}
                  aria-describedby="company-error"
                />
                {errors.company_name && (
                  <p className="text-sm text-destructive" id="company-error">
                    {errors.company_name.message}
                  </p>
                )}
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    {...register('first_name')}
                    id="first_name"
                    type="text"
                    className={cn(errors.first_name && "border-destructive focus-visible:ring-destructive")}
                    placeholder="First name"
                    aria-invalid={errors.first_name ? "true" : "false"}
                    aria-describedby="first-name-error"
                  />
                  {errors.first_name && (
                    <p className="text-sm text-destructive" id="first-name-error">
                      {errors.first_name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    {...register('last_name')}
                    id="last_name"
                    type="text"
                    className={cn(errors.last_name && "border-destructive focus-visible:ring-destructive")}
                    placeholder="Last name"
                    aria-invalid={errors.last_name ? "true" : "false"}
                    aria-describedby="last-name-error"
                  />
                  {errors.last_name && (
                    <p className="text-sm text-destructive" id="last-name-error">
                      {errors.last_name.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  {...register('email')}
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={cn(errors.email && "border-destructive focus-visible:ring-destructive")}
                  placeholder="Enter your email"
                  aria-invalid={errors.email ? "true" : "false"}
                  aria-describedby="email-error"
                />
                {errors.email && (
                  <p className="text-sm text-destructive" id="email-error">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    {...register('password')}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={cn("pr-10", errors.password && "border-destructive focus-visible:ring-destructive")}
                    placeholder="Create a password"
                    aria-invalid={errors.password ? "true" : "false"}
                    aria-describedby="password-error"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive" id="password-error">
                    {errors.password.message}
                  </p>
                )}
                {password && password.length > 0 && (
                  <PasswordStrengthMeter password={password} />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    {...register('confirmPassword')}
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={cn("pr-10", errors.confirmPassword && "border-destructive focus-visible:ring-destructive")}
                    placeholder="Confirm your password"
                    aria-invalid={errors.confirmPassword ? "true" : "false"}
                    aria-describedby="confirm-password-error"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive" id="confirm-password-error">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  {...register('acceptTerms')}
                  id="acceptTerms"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                />
                <label htmlFor="acceptTerms" className="ml-2 block text-sm text-neutral-900">
                  I agree to the{' '}
                  <a href="#" className="text-primary-600 hover:text-primary-500">
                    Terms and Conditions
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-primary-600 hover:text-primary-500">
                    Privacy Policy
                  </a>
                </label>
              </div>
              {errors.acceptTerms && (
                <p className="text-sm text-destructive">{errors.acceptTerms.message}</p>
              )}

              <Button
                type="submit"
                disabled={isLoading || !isDirty || !isValid}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2"></div>
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>

              <div className="text-center">
                <p className="text-sm text-neutral-600">
                  Already have an account?{' '}
                  <Link
                    href="/auth/login"
                    className="font-medium text-primary-600 hover:text-primary-500"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right side - Features */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
          <div className="text-center text-white px-8">
            <div className="mb-8">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold mb-2">Join AgroMart</h1>
              <p className="text-primary-100 text-lg">Start your inventory management journey</p>
            </div>
            <div className="space-y-4 text-left max-w-md">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Quick Setup</h3>
                  <p className="text-primary-100 text-sm">
                    Get started in minutes with our guided setup process
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Secure & Reliable</h3>
                  <p className="text-primary-100 text-sm">
                    Enterprise-grade security with 99.9% uptime guarantee
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">24/7 Support</h3>
                  <p className="text-primary-100 text-sm">
                    Get help whenever you need it with our dedicated support team
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

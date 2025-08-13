'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { PasswordStrengthMeter } from '@/components/ui/password-strength';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ErrorIcon } from '@/components/icons/ErrorIcon';
import { CheckIcon } from '@/components/icons/CheckIcon';
import { RegisterIcon } from '@/components/icons/RegisterIcon';

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
    } catch (error: any) {
      setApiError(error.message || 'Registration failed. Please try again.');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex">
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
              {apiError && (
                <Card className="border-destructive bg-destructive/10">
                  <CardContent className="flex items-start space-x-2 p-4">
                    <ErrorIcon className="h-5 w-5 text-destructive mt-0.5" />
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
                  <Link href="/terms" className="text-primary-600 hover:text-primary-500">
                    Terms and Conditions
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-primary-600 hover:text-primary-500">
                    Privacy Policy
                  </Link>
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

      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
          <div className="text-center text-white px-8">
            <div className="mb-8">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <RegisterIcon className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold mb-2">Join AgroMart</h1>
              <p className="text-primary-100 text-lg">Start your inventory management journey</p>
            </div>
            <div className="space-y-4 text-left max-w-md">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckIcon className="w-3 h-3 text-white" />
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
                  <CheckIcon className="w-3 h-3 text-white" />
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
                  <CheckIcon className="w-3 h-3 text-white" />
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

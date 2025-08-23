'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ErrorIcon } from '@/components/icons/ErrorIcon';
import { CheckIcon } from '@/components/icons/CheckIcon';
import { LogoIcon } from '@/components/icons/LogoIcon';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { login, isLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      remember: true,
    }
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    try {
      await login(data, data.remember);
    } catch (error: any) {
      setApiError(error.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      <div className="flex items-center justify-center py-12 px-4">
        <div className="mx-auto grid w-full max-w-md gap-6">
          <div className="grid gap-3 text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-2">
              <LogoIcon className="w-6 h-6 text-primary" />
            </div>
            <h1 id="login-heading" className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Welcome back
            </h1>
            <p className="text-balance text-muted-foreground">
              Enter your email and password to access your AgroMart account
            </p>
          </div>
          <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)} role="form" aria-labelledby="login-heading">
            {apiError && (
              <Card className="border-destructive bg-destructive/10">
                <CardContent className="flex items-start space-x-2 p-4">
                  <ErrorIcon className="h-5 w-5 text-destructive mt-0.5" />
                  <p className="text-sm font-medium text-destructive">{apiError}</p>
                </CardContent>
              </Card>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                {...register('email')}
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                className={cn(errors.email && "border-destructive focus-visible:ring-destructive")}
                aria-invalid={errors.email ? "true" : "false"}
                aria-describedby={errors.email ? "email-error" : undefined}
                aria-required="true"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-destructive" id="email-error" role="alert" aria-live="polite">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="#"
                  className="ml-auto inline-block text-sm underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                  tabIndex={0}
                >
                  Forgot your password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  {...register('password')}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className={cn("pr-10", errors.password && "border-destructive focus-visible:ring-destructive")}
                  aria-invalid={errors.password ? "true" : "false"}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  aria-required="true"
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <EyeIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive" id="password-error" role="alert" aria-live="polite">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember-me"
                {...register('remember')}
              />
              <Label htmlFor="remember-me" className="text-sm font-normal">
                Remember me
              </Label>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !isDirty || !isValid}
              aria-describedby={apiError ? "api-error" : undefined}
            >
              {isLoading ? 'Signing in...' : 'Login'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Don't have an account?{" "}
            <Link href="/auth/register" className="underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden lg:flex bg-gradient-to-br from-primary/5 via-primary/10 to-purple-500/10 relative overflow-hidden">
        <div className="flex items-center justify-center h-full w-full p-8">
          <div className="text-center max-w-lg relative z-10">
            <div className="mb-10">
              <div className="w-24 h-24 bg-gradient-to-br from-primary to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <LogoIcon className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                AgroMart
              </h1>
              <p className="text-muted-foreground text-xl font-medium">
                Professional Inventory Management
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Built for agricultural businesses
              </p>
            </div>
            <div className="space-y-6 text-left max-w-md mx-auto">
              <div className="group flex items-start space-x-4 p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-white/20 hover:bg-white/70 transition-all duration-300">
                <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
                  <CheckIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Real-time Inventory Tracking</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Monitor your agricultural products and supplies in real-time with instant updates
                  </p>
                </div>
              </div>
              <div className="group flex items-start space-x-4 p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-white/20 hover:bg-white/70 transition-all duration-300">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
                  <CheckIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Multi-tenant Architecture</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Secure, isolated environments for each organization with enterprise-grade security
                  </p>
                </div>
              </div>
              <div className="group flex items-start space-x-4 p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-white/20 hover:bg-white/70 transition-all duration-300">
                <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
                  <CheckIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Advanced Analytics</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Get insights with comprehensive reports and interactive dashboards
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Background decorations */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
}

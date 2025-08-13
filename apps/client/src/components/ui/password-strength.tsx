import React from 'react';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  bgColor: string;
}

const calculatePasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  
  if (score <= 2) {
    return {
      score,
      label: 'Weak',
      color: 'text-red-600',
      bgColor: 'bg-red-500'
    };
  } else if (score <= 4) {
    return {
      score,
      label: 'Medium',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500'
    };
  } else {
    return {
      score,
      label: 'Strong',
      color: 'text-green-600',
      bgColor: 'bg-green-500'
    };
  }
};

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  const strength = calculatePasswordStrength(password);
  const percentage = Math.min((strength.score / 6) * 100, 100);
  
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Password strength</span>
        <span className={cn('text-sm font-medium', strength.color)}>
          {strength.label}
        </span>
      </div>
      
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={cn('h-2 rounded-full transition-all duration-300', strength.bgColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="grid grid-cols-2 gap-2">
          <div className={cn('flex items-center', password.length >= 8 ? 'text-green-600' : 'text-muted-foreground')}>
            <span className="mr-1">{password.length >= 8 ? '✓' : '○'}</span>
            8+ characters
          </div>
          <div className={cn('flex items-center', /[A-Z]/.test(password) ? 'text-green-600' : 'text-muted-foreground')}>
            <span className="mr-1">{/[A-Z]/.test(password) ? '✓' : '○'}</span>
            Uppercase letter
          </div>
          <div className={cn('flex items-center', /[a-z]/.test(password) ? 'text-green-600' : 'text-muted-foreground')}>
            <span className="mr-1">{/[a-z]/.test(password) ? '✓' : '○'}</span>
            Lowercase letter
          </div>
          <div className={cn('flex items-center', /[0-9]/.test(password) ? 'text-green-600' : 'text-muted-foreground')}>
            <span className="mr-1">{/[0-9]/.test(password) ? '✓' : '○'}</span>
            Number
          </div>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useState } from 'react';

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const [strength, setStrength] = useState(0);
  const [label, setLabel] = useState('');
  const [labelColor, setLabelColor] = useState('text-neutral-500');

  useEffect(() => {
    let score = 0;
    
    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    
    // Character variety
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    
    setStrength(Math.min(score, 5));
    
    // Set label and color
    switch (score) {
      case 0:
        setLabel('Very Weak');
        setLabelColor('text-error-500');
        break;
      case 1:
      case 2:
        setLabel('Weak');
        setLabelColor('text-error-500');
        break;
      case 3:
        setLabel('Medium');
        setLabelColor('text-warning-500');
        break;
      case 4:
        setLabel('Strong');
        setLabelColor('text-success-500');
        break;
      case 5:
        setLabel('Very Strong');
        setLabelColor('text-success-600');
        break;
      default:
        setLabel('');
        setLabelColor('text-neutral-500');
    }
  }, [password]);

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-sm">
        <span className={labelColor}>{label}</span>
        <span className="text-neutral-500">Strength: {strength}/5</span>
      </div>
      <div className="mt-1 w-full bg-neutral-200 rounded-full h-2">
        <div 
          className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
          style={{ width: `${strength * 20}%` }}
        />
      </div>
    </div>
  );
}
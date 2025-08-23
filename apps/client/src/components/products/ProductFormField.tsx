import React from 'react';
import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FormFieldConfig, ProductFormData } from '@/types/product-forms';

interface ProductFormFieldProps {
  config: FormFieldConfig;
  className?: string;
}

export const ProductFormField: React.FC<ProductFormFieldProps> = ({
  config,
  className,
}) => {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
    trigger,
  } = useFormContext<ProductFormData>();

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const setNestedValue = (obj: any, path: string, value: any) => {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  };

  const fieldError = getNestedValue(errors, config.name);
  const fieldValue = watch(config.name as any);

  const renderField = () => {
    switch (config.type) {
      case 'text':
        return (
          <Input
            {...register(config.name as any)}
            type="text"
            placeholder={config.placeholder}
            className={cn(
              fieldError && "border-destructive focus-visible:ring-destructive",
              className
            )}
            aria-invalid={!!fieldError}
            aria-describedby={fieldError ? `${config.name}-error` : undefined}
            onBlur={() => trigger(config.name as any)}
          />
        );

      case 'number':
        return (
          <Input
            {...register(config.name as any)}
            type="number"
            step={config.name.includes('price') ? '0.01' : '1'}
            min={config.validation?.min}
            max={config.validation?.max}
            placeholder={config.placeholder}
            className={cn(
              fieldError && "border-destructive focus-visible:ring-destructive",
              className
            )}
            aria-invalid={!!fieldError}
            aria-describedby={fieldError ? `${config.name}-error` : undefined}
            onBlur={() => trigger(config.name as any)}
          />
        );

      case 'textarea':
        return (
          <Textarea
            {...register(config.name as any)}
            placeholder={config.placeholder}
            rows={4}
            className={cn(
              fieldError && "border-destructive focus-visible:ring-destructive",
              className
            )}
            aria-invalid={!!fieldError}
            aria-describedby={fieldError ? `${config.name}-error` : undefined}
            onBlur={() => trigger(config.name as any)}
          />
        );

      case 'select':
        return (
          <Select
            value={fieldValue || ''}
            onValueChange={(value) => {
              setValue(config.name as any, value, { shouldValidate: true, shouldDirty: true });
            }}
          >
            <SelectTrigger
              className={cn(
                fieldError && "border-destructive focus-visible:ring-destructive",
                className
              )}
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? `${config.name}-error` : undefined}
            >
              <SelectValue placeholder={config.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {config.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'tags':
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1 min-h-[2.5rem] p-2 border rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              {(fieldValue as string[])?.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                  <button
                    type="button"
                    onClick={() => {
                      const newTags = (fieldValue as string[]).filter((_, i) => i !== index);
                      setValue(config.name as any, newTags, { shouldValidate: true, shouldDirty: true });
                    }}
                    className="ml-1 hover:text-destructive"
                    aria-label={`Remove ${tag} tag`}
                  >
                    ×
                  </button>
                </Badge>
              ))}
              <input
                type="text"
                placeholder={config.placeholder || "Add tag..."}
                className="flex-1 outline-none bg-transparent text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const value = (e.target as HTMLInputElement).value.trim();
                    if (value && !(fieldValue as string[])?.includes(value)) {
                      const newTags = [...(fieldValue as string[] || []), value];
                      setValue(config.name as any, newTags, { shouldValidate: true, shouldDirty: true });
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value && !(fieldValue as string[])?.includes(value)) {
                    const newTags = [...(fieldValue as string[] || []), value];
                    setValue(config.name as any, newTags, { shouldValidate: true, shouldDirty: true });
                    e.target.value = '';
                  }
                }}
              />
            </div>
            {fieldError && (
              <p className="text-sm text-destructive" id={`${config.name}-error`}>
                {fieldError.message}
              </p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              {...register(config.name as any)}
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? `${config.name}-error` : undefined}
            />
            <Label htmlFor={config.name} className="text-sm font-normal">
              {config.label}
            </Label>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-2">
            <Input
              {...register(config.name as any)}
              type="file"
              accept="image/*"
              className={cn(
                fieldError && "border-destructive focus-visible:ring-destructive",
                className
              )}
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? `${config.name}-error` : undefined}
              onBlur={() => trigger(config.name as any)}
            />
            {fieldValue && (
              <div className="text-sm text-muted-foreground">
                Current: {fieldValue}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      {config.type !== 'checkbox' && (
        <Label htmlFor={config.name} className="text-sm font-medium">
          {config.label}
          {config.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      {renderField()}

      {config.description && !fieldError && (
        <p className="text-sm text-muted-foreground">
          {config.description}
        </p>
      )}

      {fieldError && config.type !== 'tags' && (
        <p className="text-sm text-destructive" id={`${config.name}-error`}>
          {fieldError.message}
        </p>
      )}
    </div>
  );
};

export default ProductFormField;
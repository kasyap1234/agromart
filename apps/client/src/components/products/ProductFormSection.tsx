import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormSection as FormSectionType, FormFieldConfig } from '@/types/product-forms';
import ProductFormField from './ProductFormField';

interface ProductFormSectionProps {
  section: FormSectionType;
  className?: string;
}

export const ProductFormSection: React.FC<ProductFormSectionProps> = ({
  section,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(section.defaultExpanded !== false);

  const toggleExpanded = () => {
    if (section.collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <Card className={cn(className)}>
      <CardHeader
        className={cn(
          'cursor-pointer transition-colors',
          section.collapsible && 'hover:bg-muted/50'
        )}
        onClick={toggleExpanded}
      >
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{section.title}</CardTitle>
            {section.description && (
              <CardDescription>{section.description}</CardDescription>
            )}
          </div>
          {section.collapsible && (
            <Button variant="ghost" size="sm" className="p-1">
              {isExpanded ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {section.fields.map((field, index) => (
              <div
                key={field.name}
                className={cn(
                  'space-y-2',
                  field.name === 'description' && 'md:col-span-2'
                )}
              >
                <ProductFormField config={field} />
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default ProductFormSection;
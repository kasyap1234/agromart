import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface PageContainerProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function PageContainer({ 
  children,
  title,
  description 
}: PageContainerProps) {
  return (
    <div className="space-y-6">
      {(title || description) && (
        <div className="mb-6">
          {title && <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>}
          {description && <p className="text-muted-foreground mt-2">{description}</p>}
        </div>
      )}
      
      <Card className="p-6 bg-background shadow-sm rounded-xl">
        {children}
      </Card>
    </div>
  );
}
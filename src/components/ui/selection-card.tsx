import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SelectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  isSelected?: boolean;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  disabled?: boolean;
  price?: string;
  children?: React.ReactNode;
}

const SelectionCard = React.forwardRef<HTMLDivElement, SelectionCardProps>(
  ({ 
    className, 
    title, 
    description, 
    icon, 
    isSelected, 
    badge, 
    badgeVariant = "secondary",
    disabled,
    price,
    children,
    ...props 
  }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          "relative cursor-pointer transition-all duration-300 bg-card",
          "hover:shadow-lg hover:-translate-y-1",
          isSelected && "rainbow-border rainbow-border-slow shadow-lg",
          !isSelected && "border border-border hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
          className
        )}
        {...props}
      >
        {/* Badge */}
        {badge && (
          <Badge 
            variant={badgeVariant}
            className="absolute -top-2 -right-2 text-xs shadow-sm z-10"
          >
            {badge}
          </Badge>
        )}

        <CardHeader className="pb-2">
          {/* Icon */}
          {icon && (
            <div 
              className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center mb-3 transition-all duration-300",
                isSelected 
                  ? "bg-foreground text-background shadow-md" 
                  : "bg-muted text-muted-foreground"
              )}
            >
              {icon}
            </div>
          )}
          
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-lg">{title}</CardTitle>
              {description && (
                <CardDescription className="text-sm">
                  {description}
                </CardDescription>
              )}
            </div>
            
            {/* Price */}
            {price && (
              <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                {price}
              </span>
            )}
          </div>
        </CardHeader>

        {children && (
          <CardContent className="pt-0">
            {children}
          </CardContent>
        )}

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute top-3 right-3">
            <div className="h-5 w-5 rounded-full bg-foreground flex items-center justify-center">
              <svg className="h-3 w-3 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </Card>
    );
  }
);
SelectionCard.displayName = "SelectionCard";

export { SelectionCard };

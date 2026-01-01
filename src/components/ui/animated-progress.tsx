import * as React from "react";
import { cn } from "@/lib/utils";

interface AnimatedProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  showLabel?: boolean;
  showPercentage?: boolean;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "rainbow" | "success";
}

const AnimatedProgress = React.forwardRef<HTMLDivElement, AnimatedProgressProps>(
  (
    {
      className,
      value,
      max = 100,
      showLabel = false,
      showPercentage = true,
      label,
      size = "md",
      variant = "rainbow",
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    const sizeClasses = {
      sm: "h-2",
      md: "h-3",
      lg: "h-4",
    };

    const barClasses = {
      default: "bg-foreground",
      rainbow: "bg-foreground",
      success: "bg-foreground",
    };

    return (
      <div ref={ref} className={cn("w-full space-y-2", className)} {...props}>
        {(showLabel || showPercentage) && (
          <div className="flex items-center justify-between text-sm">
            {showLabel && label && (
              <span className="font-medium text-foreground">{label}</span>
            )}
            {showPercentage && (
              <span className="text-muted-foreground font-medium">
                {Math.round(percentage)}%
              </span>
            )}
          </div>
        )}
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-full bg-muted",
            sizeClasses[size]
          )}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              barClasses[variant]
            )}
            style={{ width: `${percentage}%` }}
          >
            {/* Shimmer overlay */}
            <div className="absolute inset-0 shimmer" />
          </div>
        </div>
      </div>
    );
  }
);
AnimatedProgress.displayName = "AnimatedProgress";

export { AnimatedProgress };

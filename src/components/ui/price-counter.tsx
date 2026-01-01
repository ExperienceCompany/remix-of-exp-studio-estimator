import * as React from "react";
import { cn } from "@/lib/utils";

interface PriceCounterProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  size?: "sm" | "md" | "lg" | "xl";
}

const PriceCounter = React.forwardRef<HTMLDivElement, PriceCounterProps>(
  ({ className, value, prefix = "$", suffix = "", duration = 500, size = "lg", ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(value);
    const [isAnimating, setIsAnimating] = React.useState(false);
    const prevValue = React.useRef(value);

    React.useEffect(() => {
      if (prevValue.current !== value) {
        setIsAnimating(true);
        const startValue = prevValue.current;
        const endValue = value;
        const startTime = Date.now();

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Ease out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = startValue + (endValue - startValue) * eased;
          
          setDisplayValue(Math.round(current));

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            setDisplayValue(endValue);
            setIsAnimating(false);
            prevValue.current = endValue;
          }
        };

        requestAnimationFrame(animate);
      }
    }, [value, duration]);

    const sizeClasses = {
      sm: "text-lg font-semibold",
      md: "text-xl font-bold",
      lg: "text-2xl font-bold",
      xl: "text-3xl font-bold",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-baseline transition-transform",
          isAnimating && "scale-105",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <span className="text-muted-foreground mr-0.5">{prefix}</span>
        <span 
          className={cn(
            "tabular-nums transition-colors",
            isAnimating && "text-primary"
          )}
        >
          {displayValue.toLocaleString()}
        </span>
        {suffix && <span className="text-muted-foreground ml-0.5">{suffix}</span>}
      </div>
    );
  }
);
PriceCounter.displayName = "PriceCounter";

export { PriceCounter };

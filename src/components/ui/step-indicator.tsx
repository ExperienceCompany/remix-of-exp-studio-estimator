import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  id: string;
  label: string;
}

interface StepIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: Step[];
  currentStep: number;
  variant?: "default" | "compact";
}

const StepIndicator = React.forwardRef<HTMLDivElement, StepIndicatorProps>(
  ({ className, steps, currentStep, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("w-full", className)}
        {...props}
      >
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isLast = index === steps.length - 1;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-2">
                  {/* Step circle */}
                  <div
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                      isCompleted && "border-transparent bg-foreground text-background",
                      isCurrent && "rainbow-border border-transparent bg-background text-foreground",
                      !isCompleted && !isCurrent && "border-muted bg-background text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  
                  {/* Step label */}
                  {variant === "default" && (
                    <span
                      className={cn(
                        "text-xs font-medium text-center max-w-[80px] transition-colors duration-300",
                        (isCompleted || isCurrent) ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  )}
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div className="relative flex-1 mx-2">
                    <div className="absolute top-1/2 -translate-y-1/2 w-full h-0.5 bg-muted" />
                    <div
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 h-0.5 bg-foreground transition-all duration-500 ease-out",
                        isCompleted ? "w-full" : "w-0"
                      )}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }
);
StepIndicator.displayName = "StepIndicator";

export { StepIndicator };

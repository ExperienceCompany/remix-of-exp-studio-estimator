import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedProgress } from '@/components/ui/animated-progress';

interface AnimatedStepperProps {
  steps: readonly string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

const MOTIVATIONAL_MESSAGES = [
  "Let's get started!",
  "Great choice!",
  "Looking good!",
  "You're doing great!",
  "Almost there!",
  "Just a bit more!",
  "Final touches!",
  "Ready to book!",
];

export function AnimatedStepper({ steps, currentStep, onStepClick }: AnimatedStepperProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;
  const motivationalMessage = MOTIVATIONAL_MESSAGES[Math.min(currentStep, MOTIVATIONAL_MESSAGES.length - 1)];

  return (
    <div className="w-full space-y-4">
      {/* Progress bar with percentage */}
      <div className="space-y-2">
        <AnimatedProgress 
          value={progress} 
          size="lg" 
          variant="rainbow"
          showPercentage={true}
          showLabel={true}
          label={motivationalMessage}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between px-2">
        {steps.map((label, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <div key={label} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {/* Connector line (before) */}
                {index > 0 && (
                  <div 
                    className={cn(
                      "h-0.5 flex-1 transition-all duration-500",
                      isCompleted || isCurrent ? "bg-foreground" : "bg-muted"
                    )}
                  />
                )}

                {/* Step circle */}
                <button
                  onClick={() => isCompleted && onStepClick?.(index)}
                  disabled={isUpcoming}
                  className={cn(
                    "relative flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold transition-all duration-300 shrink-0",
                    isCompleted && "bg-foreground text-background cursor-pointer hover:scale-110 shadow-md",
                    isCurrent && "rainbow-border rainbow-border-slow bg-card text-card-foreground shadow-lg scale-110",
                    isUpcoming && "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </button>

                {/* Connector line (after) */}
                {index < steps.length - 1 && (
                  <div 
                    className={cn(
                      "h-0.5 flex-1 transition-all duration-500",
                      isCompleted ? "bg-foreground" : "bg-muted"
                    )}
                  />
                )}
              </div>

              {/* Step label */}
              <span 
                className={cn(
                  "mt-2 text-xs text-center transition-colors line-clamp-1 max-w-[60px] sm:max-w-[80px]",
                  isCurrent ? "text-foreground font-semibold" : "text-muted-foreground"
                )}
              >
                {label.split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

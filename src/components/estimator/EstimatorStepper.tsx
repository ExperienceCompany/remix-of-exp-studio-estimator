import { useEstimator } from '@/contexts/EstimatorContext';
import { STEP_LABELS } from '@/types/estimator';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { StepSessionType } from './steps/StepSessionType';
import { StepStudio } from './steps/StepStudio';
import { StepService } from './steps/StepService';
import { StepTimeSlot } from './steps/StepTimeSlot';
import { StepDuration } from './steps/StepDuration';
import { StepAddons } from './steps/StepAddons';
import { StepSummary } from './steps/StepSummary';

const STEPS = [
  StepSessionType,
  StepStudio,
  StepService,
  StepTimeSlot,
  StepDuration,
  StepAddons,
  StepSummary,
];

export function EstimatorStepper() {
  const { currentStep, setCurrentStep } = useEstimator();

  const CurrentStepComponent = STEPS[currentStep];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-8 px-4">
        {STEP_LABELS.map((label, index) => (
          <div key={label} className="flex items-center">
            <button
              onClick={() => index < currentStep && setCurrentStep(index)}
              disabled={index > currentStep}
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                index < currentStep && "bg-primary text-primary-foreground cursor-pointer",
                index === currentStep && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                index > currentStep && "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
            </button>
            {index < STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  "hidden sm:block w-12 h-0.5 mx-1",
                  index < currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Current step label */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">{STEP_LABELS[currentStep]}</h2>
      </div>

      {/* Step content */}
      <div className="animate-fade-in">
        <CurrentStepComponent />
      </div>
    </div>
  );
}

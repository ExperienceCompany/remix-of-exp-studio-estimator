import { useEstimator } from '@/contexts/EstimatorContext';
import { STEP_LABELS, DIY_STEP_LABELS } from '@/types/estimator';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { StepSessionType } from './steps/StepSessionType';
import { StepStudio } from './steps/StepStudio';
import { StepService } from './steps/StepService';
import { StepTimeSlot } from './steps/StepTimeSlot';
import { StepDuration } from './steps/StepDuration';
import { StepAddons } from './steps/StepAddons';
import { StepConfigure } from './steps/StepConfigure';
import { StepSummary } from './steps/StepSummary';
import { SelectionSummary } from './SelectionSummary';

const STEPS = [
  StepSessionType,
  StepStudio,
  StepService,
  StepTimeSlot,
  StepDuration,
  StepAddons,
  StepConfigure,
  StepSummary,
];

export function EstimatorStepper() {
  const { currentStep, setCurrentStep, selection } = useEstimator();
  
  const isDiy = selection.sessionType === 'diy';
  const stepLabels = isDiy ? DIY_STEP_LABELS : STEP_LABELS;
  
  // Map visual step index to actual step index for DIY
  const getActualStep = (visualIndex: number) => {
    if (!isDiy) return visualIndex;
    // DIY skips step 2 (Service), so visual indices 2+ map to actual indices 3+
    return visualIndex >= 2 ? visualIndex + 1 : visualIndex;
  };
  
  // Map actual step index to visual step index for DIY
  const getVisualStep = (actualIndex: number) => {
    if (!isDiy) return actualIndex;
    // For DIY, actual step 3+ maps to visual step 2+
    return actualIndex >= 3 ? actualIndex - 1 : actualIndex;
  };

  const CurrentStepComponent = STEPS[currentStep];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-8 px-4">
        {stepLabels.map((label, visualIndex) => {
          const actualIndex = getActualStep(visualIndex);
          const visualCurrentStep = getVisualStep(currentStep);
          
          return (
            <div key={label} className="flex items-center">
              <button
                onClick={() => visualIndex < visualCurrentStep && setCurrentStep(actualIndex)}
                disabled={visualIndex > visualCurrentStep}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                  visualIndex < visualCurrentStep && "bg-primary text-primary-foreground cursor-pointer",
                  visualIndex === visualCurrentStep && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  visualIndex > visualCurrentStep && "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {visualIndex < visualCurrentStep ? <Check className="h-4 w-4" /> : visualIndex + 1}
              </button>
              {visualIndex < stepLabels.length - 1 && (
                <div
                  className={cn(
                    "hidden sm:block w-12 h-0.5 mx-1",
                    visualIndex < visualCurrentStep ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current step label */}
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold">{stepLabels[getVisualStep(currentStep)]}</h2>
      </div>

      {/* Selection summary */}
      <SelectionSummary />

      {/* Step content */}
      <div className="animate-fade-in">
        <CurrentStepComponent />
      </div>
    </div>
  );
}

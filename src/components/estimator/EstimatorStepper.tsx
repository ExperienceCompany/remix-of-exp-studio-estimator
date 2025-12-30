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

// Serviced flow: Session Type -> Service -> Studio -> Day/Time -> Duration -> Add-ons -> Configure -> Summary
// DIY flow: Session Type -> Studio -> Day/Time -> Duration -> Add-ons -> Configure -> Summary
const SERVICED_STEPS = [
  StepSessionType,  // 0
  StepService,      // 1
  StepStudio,       // 2
  StepTimeSlot,     // 3
  StepDuration,     // 4
  StepAddons,       // 5
  StepConfigure,    // 6
  StepSummary,      // 7
];

const DIY_STEPS = [
  StepSessionType,  // 0
  StepStudio,       // 1
  StepTimeSlot,     // 2 (was 3)
  StepDuration,     // 3 (was 4)
  StepAddons,       // 4 (was 5)
  StepConfigure,    // 5 (was 6)
  StepSummary,      // 6 (was 7)
];

// Single-studio services that skip the studio step
const SINGLE_STUDIO_SERVICES = ['photoshoot', 'recording_session', 'audio_podcast'];

export function EstimatorStepper() {
  const { currentStep, setCurrentStep, selection } = useEstimator();
  
  const isDiy = selection.sessionType === 'diy';
  const isServiced = selection.sessionType === 'serviced';
  
  // For serviced sessions with single-studio services, we skip the Studio step
  const skipStudioStep = isServiced && selection.serviceType && SINGLE_STUDIO_SERVICES.includes(selection.serviceType);
  
  // Get the appropriate step labels
  const getStepLabels = () => {
    if (isDiy) {
      return DIY_STEP_LABELS;
    }
    if (skipStudioStep) {
      // Remove 'Studio' from labels for single-studio services
      return STEP_LABELS.filter(label => label !== 'Studio');
    }
    return STEP_LABELS;
  };
  
  const stepLabels = getStepLabels();
  
  // Map visual step index to actual step index
  const getActualStep = (visualIndex: number) => {
    if (isDiy) {
      // DIY uses its own step array directly
      return visualIndex;
    }
    if (skipStudioStep) {
      // Skip studio step: visual indices after 1 (Service) map to actual indices + 1
      // Visual: 0=SessionType, 1=Service, 2=Day/Time, 3=Duration...
      // Actual: 0=SessionType, 1=Service, (skip 2=Studio), 3=Day/Time, 4=Duration...
      if (visualIndex <= 1) return visualIndex;
      return visualIndex + 1; // Skip step 2 (Studio)
    }
    return visualIndex;
  };
  
  // Map actual step index to visual step index
  const getVisualStep = (actualIndex: number) => {
    if (isDiy) {
      return actualIndex;
    }
    if (skipStudioStep) {
      // Skip studio step: actual steps after 2 map to visual steps - 1
      if (actualIndex <= 1) return actualIndex;
      if (actualIndex === 2) return 1; // Studio step shouldn't be visible, map to Service
      return actualIndex - 1; // Shift down
    }
    return actualIndex;
  };

  // Get the correct step component
  const getStepComponent = () => {
    if (isDiy) {
      return DIY_STEPS[currentStep] || StepSessionType;
    }
    return SERVICED_STEPS[currentStep] || StepSessionType;
  };

  const CurrentStepComponent = getStepComponent();
  const visualCurrentStep = getVisualStep(currentStep);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-8 px-4">
        {stepLabels.map((label, visualIndex) => {
          return (
            <div key={label} className="flex items-center">
              <button
                onClick={() => visualIndex < visualCurrentStep && setCurrentStep(getActualStep(visualIndex))}
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
        <h2 className="text-xl font-semibold">{stepLabels[visualCurrentStep]}</h2>
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

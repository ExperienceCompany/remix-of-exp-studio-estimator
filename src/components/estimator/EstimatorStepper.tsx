import { useEstimator } from '@/contexts/EstimatorContext';
import { STEP_LABELS, DIY_STEP_LABELS } from '@/types/estimator';
import { AnimatedStepper } from './AnimatedStepper';
import { StepSessionType } from './steps/StepSessionType';
import { StepStudio } from './steps/StepStudio';
import { StepService } from './steps/StepService';
import { StepTimeSlot } from './steps/StepTimeSlot';
import { StepDuration } from './steps/StepDuration';
import { StepAddons } from './steps/StepAddons';
import { StepConfigure } from './steps/StepConfigure';
import { StepSummary } from './steps/StepSummary';
import { SelectionSummary } from './SelectionSummary';

const SERVICED_STEPS = [
  StepSessionType, StepService, StepStudio, StepTimeSlot,
  StepDuration, StepAddons, StepConfigure, StepSummary,
];

const DIY_STEPS = [
  StepSessionType, StepStudio, StepTimeSlot, StepDuration,
  StepAddons, StepConfigure, StepSummary,
];

const SINGLE_STUDIO_SERVICES = ['photoshoot', 'recording_session', 'audio_podcast'];

export function EstimatorStepper() {
  const { currentStep, setCurrentStep, selection } = useEstimator();
  
  const isDiy = selection.sessionType === 'diy';
  const isServiced = selection.sessionType === 'serviced';
  const skipStudioStep = isServiced && selection.serviceType && SINGLE_STUDIO_SERVICES.includes(selection.serviceType);
  
  const getStepLabels = () => {
    if (isDiy) return DIY_STEP_LABELS;
    if (skipStudioStep) return STEP_LABELS.filter(label => label !== 'Studio');
    return STEP_LABELS;
  };
  
  const stepLabels = getStepLabels();
  
  const getActualStep = (visualIndex: number) => {
    if (isDiy) return visualIndex;
    if (skipStudioStep) {
      if (visualIndex <= 1) return visualIndex;
      return visualIndex + 1;
    }
    return visualIndex;
  };
  
  const getVisualStep = (actualIndex: number) => {
    if (isDiy) return actualIndex;
    if (skipStudioStep) {
      if (actualIndex <= 1) return actualIndex;
      if (actualIndex === 2) return 1;
      return actualIndex - 1;
    }
    return actualIndex;
  };

  const getStepComponent = () => {
    if (isDiy) return DIY_STEPS[currentStep] || StepSessionType;
    return SERVICED_STEPS[currentStep] || StepSessionType;
  };

  const CurrentStepComponent = getStepComponent();
  const visualCurrentStep = getVisualStep(currentStep);

  const handleStepClick = (visualIndex: number) => {
    if (visualIndex < visualCurrentStep) {
      setCurrentStep(getActualStep(visualIndex));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Animated Progress Stepper */}
      <AnimatedStepper 
        steps={stepLabels}
        currentStep={visualCurrentStep}
        onStepClick={handleStepClick}
      />

      {/* Current step label */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">{stepLabels[visualCurrentStep]}</h2>
      </div>

      {/* Selection summary pills */}
      <SelectionSummary />

      {/* Step content */}
      <div className="animate-fade-in">
        <CurrentStepComponent />
      </div>
    </div>
  );
}

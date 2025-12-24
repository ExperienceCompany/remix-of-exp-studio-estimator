import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, ArrowRight, Film, Clock, CheckCircle2 } from 'lucide-react';

interface VideoService {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  incrementPrice: number;
  incrementUnit: string;
  baseDuration: number; // in seconds, 0 for non-duration-based
  durationBased: boolean;
}

// Video editing pricing tiers based on editing_menu data
const VIDEO_SERVICES: Record<string, VideoService> = {
  social_template: {
    id: 'social_template',
    name: 'Social Template Edit',
    description: 'Quick turnaround for social media clips',
    basePrice: 120,
    incrementPrice: 75,
    incrementUnit: '1-hour revision bucket',
    baseDuration: 0, // No duration limit, uses revision buckets
    durationBased: false,
  },
  general_basic: {
    id: 'general_basic',
    name: 'General Basic Editing',
    description: 'Standard cuts, transitions, and basic color correction',
    basePrice: 150,
    incrementPrice: 75,
    incrementUnit: '30 seconds',
    baseDuration: 30, // 30 seconds included
    durationBased: true,
  },
  general_advanced: {
    id: 'general_advanced',
    name: 'General Advanced Editing',
    description: 'Motion graphics, color grading, and complex transitions',
    basePrice: 250,
    incrementPrice: 125,
    incrementUnit: '30 seconds',
    baseDuration: 30,
    durationBased: true,
  },
  longform_simple: {
    id: 'longform_simple',
    name: 'Long Form Simple',
    description: 'Basic editing for longer content (podcasts, interviews)',
    basePrice: 300,
    incrementPrice: 150,
    incrementUnit: '15 minutes',
    baseDuration: 15 * 60, // 15 minutes in seconds
    durationBased: true,
  },
  longform_advanced: {
    id: 'longform_advanced',
    name: 'Long Form Advanced',
    description: 'Full production for documentaries, branded content',
    basePrice: 450,
    incrementPrice: 225,
    incrementUnit: '15 minutes',
    baseDuration: 15 * 60,
    durationBased: true,
  },
};

type ServiceId = keyof typeof VIDEO_SERVICES;

interface EstimatorState {
  step: number;
  serviceType: ServiceId | null;
  duration: number; // in seconds for duration-based, or revision buckets for social
  revisionBuckets: number;
}

export function VideoEditingEstimator() {
  const [state, setState] = useState<EstimatorState>({
    step: 1,
    serviceType: null,
    duration: 30,
    revisionBuckets: 1,
  });

  const selectedService = state.serviceType ? VIDEO_SERVICES[state.serviceType] : null;

  const calculatePrice = useMemo(() => {
    if (!selectedService) return 0;

    if (!selectedService.durationBased) {
      // Social template uses revision buckets
      return selectedService.basePrice + (state.revisionBuckets - 1) * selectedService.incrementPrice;
    }

    // Duration-based pricing
    const baseDuration = selectedService.baseDuration || 30;
    const incrementSeconds = selectedService.id.includes('longform') ? 15 * 60 : 30;
    
    if (state.duration <= baseDuration) {
      return selectedService.basePrice;
    }

    const extraDuration = state.duration - baseDuration;
    const increments = Math.ceil(extraDuration / incrementSeconds);
    return selectedService.basePrice + increments * selectedService.incrementPrice;
  }, [selectedService, state.duration, state.revisionBuckets]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleServiceSelect = (serviceId: ServiceId) => {
    setState(prev => ({
      ...prev,
      serviceType: serviceId,
      duration: VIDEO_SERVICES[serviceId].baseDuration || 30,
      revisionBuckets: 1,
    }));
  };

  const handleNext = () => {
    setState(prev => ({ ...prev, step: prev.step + 1 }));
  };

  const handleBack = () => {
    setState(prev => ({ ...prev, step: prev.step - 1 }));
  };

  const handleReset = () => {
    setState({
      step: 1,
      serviceType: null,
      duration: 30,
      revisionBuckets: 1,
    });
  };

  // Step 1: Select service type
  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Film className="h-5 w-5" />
          What type of video editing do you need?
        </CardTitle>
        <CardDescription>
          Select the service that best fits your project
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={state.serviceType || ''}
          onValueChange={(value) => handleServiceSelect(value as ServiceId)}
          className="space-y-3"
        >
          {Object.entries(VIDEO_SERVICES).map(([id, service]) => (
            <div
              key={id}
              className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                state.serviceType === id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
              onClick={() => handleServiceSelect(id as ServiceId)}
            >
              <RadioGroupItem value={id} id={id} className="mt-1" />
              <div className="flex-1">
                <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
                  {service.name}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {service.description}
                </p>
                <p className="text-xs font-medium text-primary mt-2">
                  Starting at ${service.basePrice}
                </p>
              </div>
            </div>
          ))}
        </RadioGroup>

        <div className="flex justify-end mt-6">
          <Button onClick={handleNext} disabled={!state.serviceType}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Step 2: Duration or revisions
  const renderStep2 = () => {
    if (!selectedService) return null;

    const isLongform = selectedService.id.includes('longform');

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {selectedService.durationBased
              ? 'How long is your video?'
              : 'How many revision rounds do you need?'}
          </CardTitle>
          <CardDescription>
            {selectedService.durationBased
              ? `Base price includes up to ${formatDuration(selectedService.baseDuration || 30)}`
              : 'Each revision bucket adds additional time for changes'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {selectedService.durationBased ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Video Duration</Label>
                <div className="flex items-center gap-4">
                  {isLongform ? (
                    <>
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        value={Math.floor(state.duration / 60)}
                        onChange={(e) =>
                          setState(prev => ({
                            ...prev,
                            duration: Math.max(1, parseInt(e.target.value) || 1) * 60,
                          }))
                        }
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">minutes</span>
                    </>
                  ) : (
                    <>
                      <Input
                        type="number"
                        min={15}
                        max={300}
                        step={15}
                        value={state.duration}
                        onChange={(e) =>
                          setState(prev => ({
                            ...prev,
                            duration: Math.max(15, parseInt(e.target.value) || 30),
                          }))
                        }
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">seconds</span>
                    </>
                  )}
                </div>
              </div>

              {/* Quick duration presets */}
              <div className="flex flex-wrap gap-2">
                {isLongform ? (
                  <>
                    <Button
                      variant={state.duration === 15 * 60 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setState(prev => ({ ...prev, duration: 15 * 60 }))}
                    >
                      15 min
                    </Button>
                    <Button
                      variant={state.duration === 30 * 60 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setState(prev => ({ ...prev, duration: 30 * 60 }))}
                    >
                      30 min
                    </Button>
                    <Button
                      variant={state.duration === 60 * 60 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setState(prev => ({ ...prev, duration: 60 * 60 }))}
                    >
                      1 hour
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant={state.duration === 30 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setState(prev => ({ ...prev, duration: 30 }))}
                    >
                      30 sec
                    </Button>
                    <Button
                      variant={state.duration === 60 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setState(prev => ({ ...prev, duration: 60 }))}
                    >
                      1 min
                    </Button>
                    <Button
                      variant={state.duration === 120 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setState(prev => ({ ...prev, duration: 120 }))}
                    >
                      2 min
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Revision Buckets</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={state.revisionBuckets}
                    onChange={(e) =>
                      setState(prev => ({
                        ...prev,
                        revisionBuckets: Math.max(1, parseInt(e.target.value) || 1),
                      }))
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    × 1-hour buckets
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Each bucket includes up to 1 hour of revision time
              </p>
            </div>
          )}

          {/* Price preview */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Estimated Price</span>
                <span className="text-2xl font-bold">${calculatePrice}</span>
              </div>
              {selectedService.durationBased && state.duration > (selectedService.baseDuration || 30) && (
                <p className="text-xs text-muted-foreground mt-2">
                  Base (${selectedService.basePrice}) + extra duration (+$
                  {calculatePrice - selectedService.basePrice})
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleNext}>
              View Summary
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Step 3: Summary
  const renderStep3 = () => {
    if (!selectedService) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Your Estimate
          </CardTitle>
          <CardDescription>Review your video editing service quote</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Service</span>
              <span className="font-medium">{selectedService.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">
                {selectedService.durationBased ? 'Duration' : 'Revision Buckets'}
              </span>
              <span className="font-medium">
                {selectedService.durationBased
                  ? formatDuration(state.duration)
                  : `${state.revisionBuckets} bucket${state.revisionBuckets > 1 ? 's' : ''}`}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Base Price</span>
              <span className="font-medium">${selectedService.basePrice}</span>
            </div>
            {calculatePrice > selectedService.basePrice && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Additional</span>
                <span className="font-medium">
                  +${calculatePrice - selectedService.basePrice}
                </span>
              </div>
            )}
          </div>

          <Card className="bg-primary/5 border-primary">
            <CardContent className="pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Estimate</span>
                <span className="text-3xl font-bold">${calculatePrice}</span>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-center">
            This is an estimate. Final pricing may vary based on project specifics.
          </p>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleReset}>Start New Estimate</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Progress indicator
  const renderProgress = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((step) => (
        <div
          key={step}
          className={`h-2 w-8 rounded-full transition-colors ${
            step <= state.step ? 'bg-primary' : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );

  return (
    <div>
      {renderProgress()}
      {state.step === 1 && renderStep1()}
      {state.step === 2 && renderStep2()}
      {state.step === 3 && renderStep3()}
    </div>
  );
}

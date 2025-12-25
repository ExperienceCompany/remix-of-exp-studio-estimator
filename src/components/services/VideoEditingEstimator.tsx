import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, ArrowRight, Film, Clock, CheckCircle2, RefreshCw, Minus, Plus } from 'lucide-react';

// Revisions add-on pricing (from session_addons table)
const REVISIONS_PRICE = 60; // $60 per revision
interface VideoService {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  incrementPrice: number;
  incrementUnit: string;
  baseDuration: number; // in seconds, 0 for non-duration-based
  durationBased: boolean;
  minDuration?: number; // in seconds
  maxDuration?: number; // in seconds
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
    incrementPrice: 25,
    incrementUnit: '15 seconds',
    baseDuration: 15, // 15 seconds included
    durationBased: true,
    maxDuration: 360, // 6 minutes max
  },
  general_advanced: {
    id: 'general_advanced',
    name: 'General Advanced Editing',
    description: 'Motion graphics, color grading, and complex transitions',
    basePrice: 250,
    incrementPrice: 125,
    incrementUnit: '15 seconds',
    baseDuration: 15, // 15 seconds included
    durationBased: true,
    maxDuration: 360, // 6 minutes max
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
    minDuration: 6 * 60, // 6 minutes min
    maxDuration: 4 * 60 * 60, // 4 hours max
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
    minDuration: 6 * 60, // 6 minutes min
    maxDuration: 4 * 60 * 60, // 4 hours max
  },
};

type ServiceId = keyof typeof VIDEO_SERVICES;

interface EstimatorState {
  step: number;
  serviceType: ServiceId | null;
  duration: number; // in seconds for duration-based, or revision buckets for social
  revisionBuckets: number;
  includeRevisions: boolean;
  revisionCount: number;
}

export function VideoEditingEstimator() {
  const [state, setState] = useState<EstimatorState>({
    step: 1,
    serviceType: null,
    duration: 30,
    revisionBuckets: 1,
    includeRevisions: false,
    revisionCount: 1,
  });

  const selectedService = state.serviceType ? VIDEO_SERVICES[state.serviceType] : null;

  const calculateBasePrice = useMemo(() => {
    if (!selectedService) return 0;

    if (!selectedService.durationBased) {
      // Social template uses revision buckets
      return selectedService.basePrice + (state.revisionBuckets - 1) * selectedService.incrementPrice;
    }

    // Duration-based pricing
    const baseDuration = selectedService.baseDuration || 15;
    const isLongform = selectedService.id.includes('longform');
    const incrementSeconds = isLongform ? 15 * 60 : 15; // 15 min for longform, 15 sec for regular
    
    if (state.duration <= baseDuration) {
      return selectedService.basePrice;
    }

    const extraDuration = state.duration - baseDuration;
    const increments = Math.ceil(extraDuration / incrementSeconds);
    return selectedService.basePrice + increments * selectedService.incrementPrice;
  }, [selectedService, state.duration, state.revisionBuckets]);

  const revisionsTotal = state.includeRevisions ? state.revisionCount * REVISIONS_PRICE : 0;
  const calculatePrice = calculateBasePrice + revisionsTotal;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleServiceSelect = (serviceId: ServiceId) => {
    const service = VIDEO_SERVICES[serviceId];
    // Use minDuration if set (for longform), otherwise baseDuration, fallback to 15
    const initialDuration = service.minDuration || service.baseDuration || 15;
    setState(prev => ({
      ...prev,
      serviceType: serviceId,
      duration: initialDuration,
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
      includeRevisions: false,
      revisionCount: 1,
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
    const minDuration = selectedService.minDuration || selectedService.baseDuration || 15;
    const maxDuration = selectedService.maxDuration || (isLongform ? 4 * 60 * 60 : 360);

    // Format description based on service type
    const getDurationDescription = () => {
      if (!selectedService.durationBased) {
        return 'Each revision bucket adds additional time for changes';
      }
      if (isLongform) {
        return `Minimum ${formatDuration(minDuration)}, maximum ${formatDuration(maxDuration)}. Base includes ${formatDuration(selectedService.baseDuration || 15 * 60)}`;
      }
      return `Base price includes up to ${formatDuration(selectedService.baseDuration || 15)}. Maximum ${formatDuration(maxDuration)}`;
    };

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
            {getDurationDescription()}
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
                        min={Math.floor(minDuration / 60)}
                        max={Math.floor(maxDuration / 60)}
                        step={15}
                        value={Math.floor(state.duration / 60)}
                        onChange={(e) => {
                          const mins = parseInt(e.target.value) || Math.floor(minDuration / 60);
                          const clampedMins = Math.min(Math.max(mins, Math.floor(minDuration / 60)), Math.floor(maxDuration / 60));
                          setState(prev => ({ ...prev, duration: clampedMins * 60 }));
                        }}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">minutes</span>
                    </>
                  ) : (
                    <>
                      <Input
                        type="number"
                        min={15}
                        max={maxDuration}
                        step={15}
                        value={state.duration}
                        onChange={(e) => {
                          const secs = parseInt(e.target.value) || 15;
                          const clampedSecs = Math.min(Math.max(secs, 15), maxDuration);
                          setState(prev => ({ ...prev, duration: clampedSecs }));
                        }}
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
                      variant={state.duration === 6 * 60 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setState(prev => ({ ...prev, duration: 6 * 60 }))}
                    >
                      6 min
                    </Button>
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
                    <Button
                      variant={state.duration === 2 * 60 * 60 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setState(prev => ({ ...prev, duration: 2 * 60 * 60 }))}
                    >
                      2 hours
                    </Button>
                    <Button
                      variant={state.duration === 4 * 60 * 60 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setState(prev => ({ ...prev, duration: 4 * 60 * 60 }))}
                    >
                      4 hours
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant={state.duration === 15 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setState(prev => ({ ...prev, duration: 15 }))}
                    >
                      15 sec
                    </Button>
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
                      variant={state.duration === 2 * 60 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setState(prev => ({ ...prev, duration: 2 * 60 }))}
                    >
                      2 min
                    </Button>
                    <Button
                      variant={state.duration === 4 * 60 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setState(prev => ({ ...prev, duration: 4 * 60 }))}
                    >
                      4 min
                    </Button>
                    <Button
                      variant={state.duration === 6 * 60 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setState(prev => ({ ...prev, duration: 6 * 60 }))}
                    >
                      6 min
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

          {/* Revisions Add-on */}
          <Card className="border-dashed">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Add Revisions</Label>
                    <p className="text-xs text-muted-foreground">
                      Additional revision rounds @ ${REVISIONS_PRICE}/each
                    </p>
                  </div>
                </div>
                <Switch
                  checked={state.includeRevisions}
                  onCheckedChange={(checked) =>
                    setState(prev => ({ ...prev, includeRevisions: checked }))
                  }
                />
              </div>
              
              {state.includeRevisions && (
                <div className="flex items-center gap-3 mt-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">Quantity:</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setState(prev => ({
                          ...prev,
                          revisionCount: Math.max(1, prev.revisionCount - 1),
                        }))
                      }
                      disabled={state.revisionCount <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">{state.revisionCount}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setState(prev => ({
                          ...prev,
                          revisionCount: prev.revisionCount + 1,
                        }))
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="ml-auto font-medium">${revisionsTotal}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Price preview */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Estimated Price</span>
                <span className="text-2xl font-bold">${calculatePrice}</span>
              </div>
              {(selectedService.durationBased && state.duration > (selectedService.baseDuration || 30)) || state.includeRevisions ? (
                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                  {selectedService.durationBased && state.duration > (selectedService.baseDuration || 30) && (
                    <p>Base (${selectedService.basePrice}) + extra duration (+${calculateBasePrice - selectedService.basePrice})</p>
                  )}
                  {state.includeRevisions && (
                    <p>+ {state.revisionCount} revision{state.revisionCount > 1 ? 's' : ''} (+${revisionsTotal})</p>
                  )}
                </div>
              ) : null}
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
            {calculateBasePrice > selectedService.basePrice && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Duration Add-on</span>
                <span className="font-medium">
                  +${calculateBasePrice - selectedService.basePrice}
                </span>
              </div>
            )}
            {state.includeRevisions && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">
                  Revisions ({state.revisionCount}x)
                </span>
                <span className="font-medium">+${revisionsTotal}</span>
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

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, ArrowRight, Film, Clock, CheckCircle2, RefreshCw, Minus, Plus, CheckCircle } from 'lucide-react';
import { useEditingMenu } from '@/hooks/useEstimatorData';

// Revisions add-on pricing
const REVISIONS_PRICE = 60; // $60 per additional revision

// Video editing configuration for duration-based services
const VIDEO_EDITING_CONFIG: Record<string, {
  minDuration: number;
  maxDuration: number;
  baseDuration: number;
  incrementDuration: number;
  formatDuration: (seconds: number) => string;
}> = {
  social: {
    minDuration: 0,
    maxDuration: 0,
    baseDuration: 0,
    incrementDuration: 0,
    formatDuration: () => 'N/A',
  },
  general_basic: {
    minDuration: 15,
    maxDuration: 360,
    baseDuration: 15,
    incrementDuration: 15,
    formatDuration: (s) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60 ? `${s % 60}s` : ''}`.trim(),
  },
  general_advanced: {
    minDuration: 15,
    maxDuration: 360,
    baseDuration: 15,
    incrementDuration: 15,
    formatDuration: (s) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60 ? `${s % 60}s` : ''}`.trim(),
  },
  long_form_simple: {
    minDuration: 6 * 60,
    maxDuration: 4 * 60 * 60,
    baseDuration: 15 * 60,
    incrementDuration: 15 * 60,
    formatDuration: (s) => {
      const hours = Math.floor(s / 3600);
      const mins = Math.floor((s % 3600) / 60);
      if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      return `${mins}m`;
    },
  },
  long_form_advanced: {
    minDuration: 6 * 60,
    maxDuration: 4 * 60 * 60,
    baseDuration: 15 * 60,
    incrementDuration: 15 * 60,
    formatDuration: (s) => {
      const hours = Math.floor(s / 3600);
      const mins = Math.floor((s % 3600) / 60);
      if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      return `${mins}m`;
    },
  },
};

interface EstimatorState {
  step: number;
  serviceId: string | null;
  duration: number; // in seconds for duration-based, or revision buckets for social
  includeExtraRevisions: boolean;
  extraRevisionCount: number;
}

export function VideoEditingEstimator() {
  const { data: editingMenu, isLoading } = useEditingMenu();
  
  const [state, setState] = useState<EstimatorState>({
    step: 1,
    serviceId: null,
    duration: 15,
    includeExtraRevisions: false,
    extraRevisionCount: 1,
  });

  // Filter to video editing services only (exclude photo_editing)
  const videoServices = useMemo(() => {
    return editingMenu?.filter(item => item.category !== 'photo_editing') || [];
  }, [editingMenu]);

  const selectedService = useMemo(() => {
    return videoServices.find(s => s.id === state.serviceId);
  }, [videoServices, state.serviceId]);

  const serviceConfig = useMemo(() => {
    if (!selectedService) return null;
    return VIDEO_EDITING_CONFIG[selectedService.category] || null;
  }, [selectedService]);

  const isDurationBased = serviceConfig && serviceConfig.baseDuration > 0;
  const isLongform = selectedService?.category.includes('long_form');

  const calculateBasePrice = useMemo(() => {
    if (!selectedService) return 0;

    // Use customer_price if available, otherwise base_price
    const basePrice = selectedService.customer_price || selectedService.base_price;
    const incrementPrice = selectedService.increment_price || 0;

    if (!isDurationBased || !serviceConfig) {
      // Social template - fixed price
      return basePrice;
    }

    // Duration-based pricing
    if (state.duration <= serviceConfig.baseDuration) {
      return basePrice;
    }

    const extraDuration = state.duration - serviceConfig.baseDuration;
    const increments = Math.ceil(extraDuration / serviceConfig.incrementDuration);
    return basePrice + increments * incrementPrice;
  }, [selectedService, serviceConfig, isDurationBased, state.duration]);

  const extraRevisionsTotal = state.includeExtraRevisions ? state.extraRevisionCount * REVISIONS_PRICE : 0;
  const totalPrice = calculateBasePrice + extraRevisionsTotal;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMins = minutes % 60;
      if (remainingMins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
      return `${hours}h ${remainingMins}m`;
    }
    if (remainingSeconds === 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleServiceSelect = (serviceId: string) => {
    const service = videoServices.find(s => s.id === serviceId);
    if (!service) return;
    
    const config = VIDEO_EDITING_CONFIG[service.category];
    const initialDuration = config?.minDuration || config?.baseDuration || 15;
    
    setState(prev => ({
      ...prev,
      serviceId,
      duration: initialDuration,
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
      serviceId: null,
      duration: 15,
      includeExtraRevisions: false,
      extraRevisionCount: 1,
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
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading services...</div>
        ) : (
          <RadioGroup
            value={state.serviceId || ''}
            onValueChange={handleServiceSelect}
            className="space-y-3"
          >
            {videoServices.map((service) => (
              <div
                key={service.id}
                className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  state.serviceId === service.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => handleServiceSelect(service.id)}
              >
                <RadioGroupItem value={service.id} id={service.id} className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor={service.id} className="text-sm font-medium cursor-pointer">
                    {service.name}
                  </Label>
                  {service.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {service.description}
                    </p>
                  )}
                  <p className="text-xs font-medium text-primary mt-2">
                    Starting at ${service.customer_price || service.base_price}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
        )}

        <div className="flex justify-end mt-6">
          <Button onClick={handleNext} disabled={!state.serviceId}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Step 2: Duration and revisions
  const renderStep2 = () => {
    if (!selectedService || !serviceConfig) return null;

    const minDuration = serviceConfig.minDuration || serviceConfig.baseDuration || 15;
    const maxDuration = serviceConfig.maxDuration || 360;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {isDurationBased ? 'How long is your video?' : 'Configure your edit'}
          </CardTitle>
          <CardDescription>
            {isDurationBased
              ? `Base includes ${formatDuration(serviceConfig.baseDuration)}. Maximum ${formatDuration(maxDuration)}`
              : 'Configure your social media edit'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isDurationBased && (
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
          )}

          {/* Base revision - always included */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">1 Revision Round Included</p>
                <p className="text-sm text-muted-foreground">Base revision included with your package</p>
              </div>
            </div>
          </div>

          {/* Extra Revisions Add-on */}
          <Card className="border-dashed">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Add Extra Revisions</Label>
                    <p className="text-xs text-muted-foreground">
                      Additional revision rounds @ ${REVISIONS_PRICE}/each
                    </p>
                  </div>
                </div>
                <Switch
                  checked={state.includeExtraRevisions}
                  onCheckedChange={(checked) =>
                    setState(prev => ({ ...prev, includeExtraRevisions: checked }))
                  }
                />
              </div>
              
              {state.includeExtraRevisions && (
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
                          extraRevisionCount: Math.max(1, prev.extraRevisionCount - 1),
                        }))
                      }
                      disabled={state.extraRevisionCount <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">{state.extraRevisionCount}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setState(prev => ({
                          ...prev,
                          extraRevisionCount: prev.extraRevisionCount + 1,
                        }))
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="ml-auto font-medium">${extraRevisionsTotal}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Price preview */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Estimated Price</span>
                <span className="text-2xl font-bold">${totalPrice}</span>
              </div>
              {(calculateBasePrice > (selectedService.customer_price || selectedService.base_price) || state.includeExtraRevisions) && (
                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                  {calculateBasePrice > (selectedService.customer_price || selectedService.base_price) && (
                    <p>Base (${selectedService.customer_price || selectedService.base_price}) + extra duration (+${calculateBasePrice - (selectedService.customer_price || selectedService.base_price)})</p>
                  )}
                  {state.includeExtraRevisions && (
                    <p>+ {state.extraRevisionCount} extra revision{state.extraRevisionCount > 1 ? 's' : ''} (+${extraRevisionsTotal})</p>
                  )}
                </div>
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

    const basePrice = selectedService.customer_price || selectedService.base_price;

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
            {isDurationBased && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{formatDuration(state.duration)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Base Price</span>
              <span className="font-medium">${basePrice}</span>
            </div>
            {calculateBasePrice > basePrice && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Duration Add-on</span>
                <span className="font-medium">+${calculateBasePrice - basePrice}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Included Revisions</span>
              <span className="font-medium">1 round</span>
            </div>
            {state.includeExtraRevisions && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">
                  Extra Revisions ({state.extraRevisionCount}x)
                </span>
                <span className="font-medium">+${extraRevisionsTotal}</span>
              </div>
            )}
          </div>

          <Card className="bg-primary/5 border-primary">
            <CardContent className="pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Estimate</span>
                <span className="text-3xl font-bold">${totalPrice}</span>
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

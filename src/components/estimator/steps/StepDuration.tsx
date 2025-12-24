import { useEstimator } from '@/contexts/EstimatorContext';
import { useProviderLevels } from '@/hooks/useEstimatorData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ProviderLevel } from '@/types/estimator';
import { ArrowLeft, ArrowRight, Clock, Camera } from 'lucide-react';

// Format hours as "Xh Ym"
function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function StepDuration() {
  const { selection, updateSelection, setCurrentStep, totals } = useEstimator();
  const { data: providerLevels } = useProviderLevels();

  const handleHoursChange = (value: number[]) => {
    updateSelection({ hours: value[0] });
  };

  const handleProviderChange = (value: string) => {
    updateSelection({ providerLevel: value as ProviderLevel });
  };

  const handleCameraChange = (count: number) => {
    updateSelection({ cameraCount: count });
  };

  const handleNext = () => {
    setCurrentStep(5);
  };

  // Quick select buttons for common durations
  const quickDurations = [1, 2, 3, 4];

  return (
    <div className="space-y-6">
      {/* Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Session Duration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Duration</span>
            <span className="text-2xl font-bold">{formatDuration(selection.hours)}</span>
          </div>
          <Slider
            value={[selection.hours]}
            onValueChange={handleHoursChange}
            min={0.25}
            max={8}
            step={0.25}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>15 min</span>
            <span>8 hours</span>
          </div>
          {/* Quick select buttons */}
          <div className="flex gap-2 pt-2">
            {quickDurations.map(dur => (
              <Button
                key={dur}
                variant={selection.hours === dur ? "default" : "outline"}
                size="sm"
                onClick={() => updateSelection({ hours: dur })}
                className="flex-1"
              >
                {dur}h
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Provider Level (for serviced sessions) */}
      {selection.sessionType === 'serviced' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Production Crew Level</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selection.providerLevel || 'lv2'}
              onValueChange={handleProviderChange}
              className="space-y-2"
            >
              {providerLevels?.map(level => (
                <div key={level.id} className="flex items-center space-x-3">
                  <RadioGroupItem value={level.level} id={level.level} />
                  <Label htmlFor={level.level} className="flex-1 cursor-pointer">
                    <span className="font-medium">{level.display_name}</span>
                    <span className="text-muted-foreground ml-2">
                      +${Number(level.hourly_rate)}/hr
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Camera Count (for vodcast) */}
      {selection.serviceType === 'vodcast' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="h-4 w-4" />
              Camera Angles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {[1, 2, 3].map(count => (
                <Button
                  key={count}
                  variant={selection.cameraCount === count ? "default" : "outline"}
                  onClick={() => handleCameraChange(count)}
                  className="flex-1"
                >
                  {count} Cam
                  {count > 1 && (
                    <span className="ml-1 text-xs opacity-75">
                      +${(count - 1) * 40}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Running Total */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Running Total</span>
            <span className="text-xl font-bold">${totals.customerTotal.toFixed(0)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(3)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleNext}>
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
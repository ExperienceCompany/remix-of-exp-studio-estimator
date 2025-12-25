import { useEstimator } from '@/contexts/EstimatorContext';
import { useProviderLevels } from '@/hooks/useEstimatorData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CrewAllocation } from '@/types/estimator';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, ArrowRight, Clock, Camera, Users, Minus, Plus, AlertCircle, DollarSign, Check } from 'lucide-react';

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

  const updateCrewLevel = (level: keyof CrewAllocation, delta: number) => {
    const current = selection.crewAllocation[level];
    const newValue = Math.max(0, current + delta);
    
    // For serviced sessions, enforce minimum 1 total crew
    if (selection.sessionType === 'serviced' && delta < 0) {
      const newTotal = (lv1 + lv2 + lv3) + delta;
      if (newTotal < 1) return; // Don't allow decrement below 1 total crew
    }
    
    updateSelection({
      crewAllocation: {
        ...selection.crewAllocation,
        [level]: newValue,
      },
    });
  };

  const handleCameraChange = (count: number) => {
    updateSelection({ cameraCount: count });
  };

  const handleNext = () => {
    setCurrentStep(5);
  };

  // Quick select buttons for common durations
  const quickDurations = [1, 2, 3, 4];

  // Calculate crew costs
  const { lv1, lv2, lv3 } = selection.crewAllocation;
  const totalCrew = lv1 + lv2 + lv3;
  const lv1Rate = providerLevels?.find(p => p.level === 'lv1')?.hourly_rate || 20;
  const lv2Rate = providerLevels?.find(p => p.level === 'lv2')?.hourly_rate || 30;
  const lv3Rate = providerLevels?.find(p => p.level === 'lv3')?.hourly_rate || 40;
  const totalCrewCostPerHour = lv1 * Number(lv1Rate) + lv2 * Number(lv2Rate) + lv3 * Number(lv3Rate);

  // Get auto-included session addons (like photoshoot set design fee)
  const autoIncludedAddons = selection.sessionAddons.filter(a => a.isAutoIncluded);

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
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Studio Estimate
            </span>
            <span className="text-lg font-semibold text-foreground">
              ${totals.studioTotal.toFixed(0)}
            </span>
          </div>
          <Slider
            value={[selection.hours]}
            onValueChange={handleHoursChange}
            min={1}
            max={8}
            step={0.25}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 hour</span>
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

      {/* Production Crew Level (for serviced sessions) */}
      {selection.sessionType === 'serviced' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Production Crew Level
            </CardTitle>
            <CardDescription>
              Select the number of crew members at each level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Level 1 */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium">Level 1 - Entry</p>
                <p className="text-xs text-muted-foreground">+${lv1Rate}/hr per crew</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateCrewLevel('lv1', -1)}
                  disabled={lv1 <= 0 || (totalCrew <= 1 && lv1 > 0)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-medium">{lv1}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateCrewLevel('lv1', 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Level 2 */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium">Level 2 - Experienced</p>
                <p className="text-xs text-muted-foreground">+${lv2Rate}/hr per crew</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateCrewLevel('lv2', -1)}
                  disabled={lv2 <= 0 || (totalCrew <= 1 && lv2 > 0)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-medium">{lv2}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateCrewLevel('lv2', 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Level 3 */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium">Level 3 - Expert</p>
                <p className="text-xs text-muted-foreground">+${lv3Rate}/hr per crew</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateCrewLevel('lv3', -1)}
                  disabled={lv3 <= 0 || (totalCrew <= 1 && lv3 > 0)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-medium">{lv3}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateCrewLevel('lv3', 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Minimum crew info */}
            {totalCrew === 1 && (
              <Alert variant="default" className="bg-muted">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  EXP Sessions require at least 1 crew member.
                </AlertDescription>
              </Alert>
            )}

            {/* Summary */}
            {totalCrew > 0 && (
              <div className="pt-3 border-t flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Crew: {totalCrew}</span>
                <span className="text-sm font-medium">+${totalCrewCostPerHour}/hr</span>
              </div>
            )}
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

      {/* Auto-included Addons (e.g., Photoshoot Set Design Fee) */}
      {autoIncludedAddons.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Check className="h-4 w-4 text-primary" />
              Included with Session
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {autoIncludedAddons.map(addon => (
              <div key={addon.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">{addon.name}</span>
                </div>
                <Badge variant="secondary">+${addon.flatAmount}</Badge>
              </div>
            ))}
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
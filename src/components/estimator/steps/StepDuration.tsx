import { useEstimator } from '@/contexts/EstimatorContext';
import { useProviderLevels } from '@/hooks/useEstimatorData';
import { GradientButton } from '@/components/ui/gradient-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PriceCounter } from '@/components/ui/price-counter';
import { CrewAllocation } from '@/types/estimator';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, ArrowRight, Clock, Camera, Users, Minus, Plus, AlertCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    
    if (selection.sessionType === 'serviced' && delta < 0) {
      const newTotal = (lv1 + lv2 + lv3) + delta;
      if (newTotal < 1) return;
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
    const nextStep = selection.sessionType === 'diy' ? 4 : 5;
    setCurrentStep(nextStep);
  };

  const quickDurations = [1, 2, 3, 4];

  const { lv1, lv2, lv3 } = selection.crewAllocation;
  const totalCrew = lv1 + lv2 + lv3;
  const lv1Rate = providerLevels?.find(p => p.level === 'lv1')?.hourly_rate || 20;
  const lv2Rate = providerLevels?.find(p => p.level === 'lv2')?.hourly_rate || 30;
  const lv3Rate = providerLevels?.find(p => p.level === 'lv3')?.hourly_rate || 40;
  const totalCrewCostPerHour = lv1 * Number(lv1Rate) + lv2 * Number(lv2Rate) + lv3 * Number(lv3Rate);

  return (
    <div className="space-y-6">
      {/* Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[hsl(180,85%,50%)] to-[hsl(270,85%,60%)] flex items-center justify-center">
              <Clock className="h-4 w-4 text-white" />
            </div>
            Session Duration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Duration</span>
            <span className="text-3xl font-bold">{formatDuration(selection.hours)}</span>
          </div>
          
          {/* Rainbow slider track */}
          <div className="relative">
            <Slider
              value={[selection.hours]}
              onValueChange={handleHoursChange}
              min={1}
              max={8}
              step={0.25}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>1 hour</span>
              <span>8 hours</span>
            </div>
          </div>
          
          {/* Quick select buttons */}
          <div className="flex gap-2">
            {quickDurations.map(dur => (
              <Button
                key={dur}
                variant={selection.hours === dur ? "default" : "outline"}
                size="sm"
                onClick={() => updateSelection({ hours: dur })}
                className={cn(
                  "flex-1 transition-all",
                  selection.hours === dur && "shadow-md"
                )}
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
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[hsl(0,85%,60%)] to-[hsl(45,85%,60%)] flex items-center justify-center">
                <Users className="h-4 w-4 text-white" />
              </div>
              Production Crew Level
            </CardTitle>
            <CardDescription>
              Select the number of crew members at each level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Level 1 */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Level 1 - Entry</p>
                  <Badge variant="secondary" className="text-xs">${lv1Rate}/hr</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Basic support & assistance</p>
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
                <span className="w-8 text-center font-bold text-lg">{lv1}</span>
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
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-primary/20">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Level 2 - Experienced</p>
                  <Badge variant="default" className="text-xs">${lv2Rate}/hr</Badge>
                  <Badge variant="secondary" className="text-xs">Recommended</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Full production capability</p>
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
                <span className="w-8 text-center font-bold text-lg">{lv2}</span>
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
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Level 3 - Expert</p>
                  <Badge variant="secondary" className="text-xs">${lv3Rate}/hr</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Senior producer/director</p>
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
                <span className="w-8 text-center font-bold text-lg">{lv3}</span>
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

            {totalCrew === 1 && (
              <Alert variant="default" className="bg-muted border-primary/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  EXP Sessions require at least 1 crew member.
                </AlertDescription>
              </Alert>
            )}

            {totalCrew > 0 && (
              <div className="pt-3 border-t flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Crew: {totalCrew}</span>
                <span className="text-sm font-semibold">+${totalCrewCostPerHour}/hr</span>
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
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[hsl(90,85%,50%)] to-[hsl(180,85%,50%)] flex items-center justify-center">
                <Camera className="h-4 w-4 text-white" />
              </div>
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
                  className={cn(
                    "flex-1 h-14 flex-col transition-all",
                    selection.cameraCount === count && "shadow-md"
                  )}
                >
                  <span className="font-bold">{count} Cam</span>
                  {count > 1 && (
                    <span className="text-xs opacity-75">
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
      <Card className="rainbow-border rainbow-border-slow">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Running Total</span>
            </div>
            <PriceCounter value={Math.round(totals.customerTotal)} size="xl" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(selection.sessionType === 'diy' ? 2 : 3)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <GradientButton onClick={handleNext}>
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </GradientButton>
      </div>
    </div>
  );
}

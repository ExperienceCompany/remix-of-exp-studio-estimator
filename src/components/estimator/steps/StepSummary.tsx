import { useEstimator } from '@/contexts/EstimatorContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  STUDIO_LABELS, 
  SERVICE_LABELS, 
  TIME_SLOT_LABELS, 
  PROVIDER_LEVEL_LABELS,
  StudioType,
  ServiceType,
  TimeSlotType,
  ProviderLevel,
} from '@/types/estimator';
import { ArrowLeft, Copy, FileText, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function StepSummary() {
  const { selection, totals, setCurrentStep, resetSelection } = useEstimator();
  const { toast } = useToast();

  const handleCopyQuote = () => {
    const lines = [
      '=== EXP Studio Quote ===',
      '',
      `Session Type: ${selection.sessionType === 'diy' ? 'DIY' : 'EXP Session'}`,
      `Studio: ${selection.studioType ? STUDIO_LABELS[selection.studioType] : 'Not selected'}`,
      `Service: ${selection.serviceType ? SERVICE_LABELS[selection.serviceType] : 'Not selected'}`,
      `Time Slot: ${selection.timeSlotType ? TIME_SLOT_LABELS[selection.timeSlotType] : 'Not selected'}`,
      `Duration: ${selection.hours} hour(s)`,
      '',
      '--- Line Items ---',
      ...totals.lineItems.map(item => `${item.label}: $${item.amount.toFixed(2)}`),
      '',
      `TOTAL: $${totals.customerTotal.toFixed(2)}`,
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    toast({ title: 'Quote copied to clipboard!' });
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Estimate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selection Summary */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Session Type</p>
              <p className="font-medium">
                {selection.sessionType === 'diy' ? 'DIY' : 'EXP Session'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Studio</p>
              <p className="font-medium">
                {selection.studioType ? STUDIO_LABELS[selection.studioType] : '-'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Service</p>
              <p className="font-medium">
                {selection.serviceType ? SERVICE_LABELS[selection.serviceType] : '-'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Time Slot</p>
              <p className="font-medium">
                {selection.timeSlotType ? TIME_SLOT_LABELS[selection.timeSlotType] : '-'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Duration</p>
              <p className="font-medium">{selection.hours} hour(s)</p>
            </div>
            {selection.sessionType === 'serviced' && selection.providerLevel && (
              <div>
                <p className="text-muted-foreground">Crew Level</p>
                <p className="font-medium">
                  {PROVIDER_LEVEL_LABELS[selection.providerLevel]}
                </p>
              </div>
            )}
            {selection.serviceType === 'vodcast' && (
              <div>
                <p className="text-muted-foreground">Cameras</p>
                <p className="font-medium">{selection.cameraCount}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Line Items */}
          <div className="space-y-2">
            {totals.lineItems.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">${item.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Estimated Total</span>
            <span className="text-2xl font-bold text-primary">
              ${totals.customerTotal.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={handleCopyQuote}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Quote
        </Button>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          Book This
        </Button>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(5)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button variant="ghost" onClick={resetSelection}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Start Over
        </Button>
      </div>
    </div>
  );
}

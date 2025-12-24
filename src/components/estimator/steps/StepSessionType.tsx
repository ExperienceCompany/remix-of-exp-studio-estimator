import { useEstimator } from '@/contexts/EstimatorContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Wrench, Users } from 'lucide-react';

export function StepSessionType() {
  const { selection, updateSelection, setCurrentStep } = useEstimator();

  const handleSelect = (type: 'diy' | 'serviced') => {
    updateSelection({ 
      sessionType: type,
      providerLevel: type === 'serviced' ? 'lv2' : null,
    });
    setCurrentStep(1);
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card 
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          selection.sessionType === 'diy' && "ring-2 ring-primary"
        )}
        onClick={() => handleSelect('diy')}
      >
        <CardHeader>
          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-2">
            <Wrench className="h-6 w-6" />
          </div>
          <CardTitle>DIY Session</CardTitle>
          <CardDescription>
            Space & equipment only. You handle everything yourself.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Full access to studio equipment</li>
            <li>• Self-operated recording</li>
            <li>• Most affordable option</li>
          </ul>
        </CardContent>
      </Card>

      <Card 
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          selection.sessionType === 'serviced' && "ring-2 ring-primary"
        )}
        onClick={() => handleSelect('serviced')}
      >
        <CardHeader>
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>EXP Session</CardTitle>
          <CardDescription>
            Space + production crew. We handle the technical work.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Professional production crew</li>
            <li>• Technical setup & operation</li>
            <li>• Seamless experience</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

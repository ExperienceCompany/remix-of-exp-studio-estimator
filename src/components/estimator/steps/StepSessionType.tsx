import { useEstimator } from '@/contexts/EstimatorContext';
import { SelectionCard } from '@/components/ui/selection-card';
import { Wrench, Users } from 'lucide-react';

export function StepSessionType() {
  const {
    selection,
    updateSelection,
    setCurrentStep
  } = useEstimator();

  const handleSelect = (type: 'diy' | 'serviced') => {
    updateSelection({
      sessionType: type,
      providerLevel: type === 'serviced' ? 'lv2' : null,
      crewAllocation: type === 'serviced' 
        ? { lv1: 0, lv2: 1, lv3: 0 }
        : { lv1: 0, lv2: 0, lv3: 0 },
    });
    setCurrentStep(1);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <SelectionCard
        title="DIY Session"
        description="Space & equipment only. You handle everything yourself."
        icon={<Wrench className="h-6 w-6" />}
        isSelected={selection.sessionType === 'diy'}
        badge="Most Popular"
        badgeVariant="secondary"
        onClick={() => handleSelect('diy')}
      >
        <ul className="text-sm text-muted-foreground space-y-1.5 mt-2">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
            Full access to studio equipment
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
            Self-operated session
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
            Most affordable option
          </li>
        </ul>
      </SelectionCard>

      <SelectionCard
        title="EXP Session"
        description="Space + production crew. We handle the technical work."
        icon={<Users className="h-6 w-6" />}
        isSelected={selection.sessionType === 'serviced'}
        badge="Premium"
        badgeVariant="default"
        onClick={() => handleSelect('serviced')}
      >
        <ul className="text-sm text-muted-foreground space-y-1.5 mt-2">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
            Professional production crew
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
            Technical setup & operation
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
            Seamless experience
          </li>
        </ul>
      </SelectionCard>
    </div>
  );
}

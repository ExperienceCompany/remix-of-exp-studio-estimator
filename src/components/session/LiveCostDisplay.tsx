import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import type { EstimatorSelection } from '@/types/estimator';
import { STUDIO_LABELS, StudioType } from '@/types/estimator';
import { useDiyRates, useProviderLevels, useVodcastCameraAddons } from '@/hooks/useEstimatorData';

interface LiveCostDisplayProps {
  selection: EstimatorSelection | null;
  elapsedSeconds: number;
  originalTotal: number | null;
}

export function LiveCostDisplay({ selection, elapsedSeconds, originalTotal }: LiveCostDisplayProps) {
  const { data: diyRates } = useDiyRates();
  const { data: providerLevels } = useProviderLevels();
  const { data: cameraAddons } = useVodcastCameraAddons();

  const costBreakdown = useMemo(() => {
    if (!selection) return { lineItems: [], total: 0 };

    const currentHours = elapsedSeconds / 3600;
    const lineItems: Array<{ label: string; amount: number }> = [];
    let total = 0;

    // Find matching DIY rate
    const matchingRate = diyRates?.find(
      r => r.studios?.type === selection.studioType && 
           r.time_slots?.type === selection.timeSlotType
    );

    // Calculate studio cost
    if (matchingRate) {
      const firstHourRate = matchingRate.first_hour_rate;
      const afterFirstHourRate = matchingRate.after_first_hour_rate;
      
      const isThursToSun = selection.timeSlotType?.startsWith('thu') || 
                           selection.timeSlotType?.startsWith('sat');
      
      let studioCost = 0;
      if (currentHours <= 1 || !isThursToSun || !afterFirstHourRate) {
        studioCost = currentHours * firstHourRate;
      } else {
        studioCost = firstHourRate + ((currentHours - 1) * afterFirstHourRate);
      }
      
      const studioName = selection.studioType 
        ? (STUDIO_LABELS[selection.studioType as StudioType] || 'Studio')
        : 'Studio';
      
      lineItems.push({
        label: `${studioName} @ $${firstHourRate}/hr`,
        amount: studioCost,
      });
      total += studioCost;
    }

    // Calculate provider cost (for serviced sessions)
    if (selection.sessionType === 'serviced' && providerLevels) {
      const { lv1, lv2, lv3 } = selection.crewAllocation;
      
      const lv1Rate = providerLevels.find(p => p.level === 'lv1')?.hourly_rate || 20;
      const lv2Rate = providerLevels.find(p => p.level === 'lv2')?.hourly_rate || 30;
      const lv3Rate = providerLevels.find(p => p.level === 'lv3')?.hourly_rate || 40;
      
      const providerCost = currentHours * ((lv1 * lv1Rate) + (lv2 * lv2Rate) + (lv3 * lv3Rate));
      
      if (providerCost > 0) {
        const crewParts = [];
        if (lv1 > 0) crewParts.push(`Lv1 ×${lv1} @ $${lv1Rate}/hr`);
        if (lv2 > 0) crewParts.push(`Lv2 ×${lv2} @ $${lv2Rate}/hr`);
        if (lv3 > 0) crewParts.push(`Lv3 ×${lv3} @ $${lv3Rate}/hr`);
        
        lineItems.push({
          label: `Provider (${crewParts.join(', ')})`,
          amount: providerCost,
        });
        total += providerCost;
      }
    }

    // Camera add-on (flat fee, not hourly)
    if (selection.serviceType === 'vodcast' && selection.cameraCount > 0 && cameraAddons) {
      const cameraAddon = cameraAddons.find(c => c.cameras === selection.cameraCount);
      if (cameraAddon) {
        lineItems.push({
          label: `Camera Add-on (${selection.cameraCount} cameras)`,
          amount: cameraAddon.customer_addon_amount,
        });
        total += cameraAddon.customer_addon_amount;
      }
    }

    // Session add-ons
    if (selection.sessionAddons && selection.sessionAddons.length > 0) {
      selection.sessionAddons.forEach(addon => {
        const addonCost = addon.isHourly 
          ? addon.flatAmount * currentHours 
          : addon.flatAmount;
        
        lineItems.push({
          label: addon.name,
          amount: addonCost,
        });
        total += addonCost;
      });
    }

    // Editing items (fixed cost, not time-based)
    if (selection.editingItems && selection.editingItems.length > 0) {
      selection.editingItems.forEach(item => {
        const itemCost = item.customerPrice * item.quantity;
        lineItems.push({
          label: `${item.name} (×${item.quantity})`,
          amount: itemCost,
        });
        total += itemCost;
      });
    }

    return { lineItems, total };
  }, [selection, elapsedSeconds, diyRates, providerLevels, cameraAddons]);

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Live Cost
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Duration Info */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Elapsed Time</span>
          <span className="font-medium">{formatDuration(elapsedSeconds)}</span>
        </div>
        
        {originalTotal && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Original Estimate</span>
            <span className="font-medium">${originalTotal.toFixed(2)}</span>
          </div>
        )}

        <div className="border-t pt-4 space-y-2">
          {costBreakdown.lineItems.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium">${item.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Current Total</span>
            <span className="text-2xl font-bold text-primary">
              ${costBreakdown.total.toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { useEstimator } from '@/contexts/EstimatorContext';
import { useVerticalAutoeditAddons, useEditingMenu } from '@/hooks/useEstimatorData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, ArrowRight, Sparkles, Film } from 'lucide-react';

export function StepAddons() {
  const { selection, updateSelection, setCurrentStep, totals } = useEstimator();
  const { data: autoEditAddons } = useVerticalAutoeditAddons();
  const { data: editingMenu } = useEditingMenu();

  // Get the time slot group for auto-edit pricing
  const timeSlotGroup = selection.timeSlotType?.startsWith('mon_wed') ? 'mon_wed' 
    : selection.timeSlotType?.startsWith('thu_fri') ? 'thu_fri' : 'sat_sun';

  const availableAutoEditTiers = autoEditAddons?.filter(
    a => a.time_slot_group === timeSlotGroup
  ) || [];

  const handleAutoEditChange = (tier: string | null) => {
    updateSelection({ autoEditTier: tier });
  };

  const toggleEditingItem = (item: any) => {
    const existing = selection.editingItems.find(e => e.id === item.id);
    if (existing) {
      updateSelection({
        editingItems: selection.editingItems.filter(e => e.id !== item.id),
      });
    } else {
      updateSelection({
        editingItems: [
          ...selection.editingItems,
          {
            id: item.id,
            name: item.name,
            quantity: 1,
            basePrice: Number(item.base_price),
            incrementPrice: item.increment_price ? Number(item.increment_price) : null,
          },
        ],
      });
    }
  };

  const handleNext = () => {
    setCurrentStep(6);
  };

  return (
    <div className="space-y-6">
      {/* Auto-Edited Vertical Video */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            Auto-Edited Vertical Video
          </CardTitle>
          <CardDescription>
            Get vertical clips auto-edited from your session (per hour)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selection.autoEditTier || 'none'}
            onValueChange={(v) => handleAutoEditChange(v === 'none' ? null : v)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="none" id="autoedit-none" />
              <Label htmlFor="autoedit-none" className="cursor-pointer">
                No auto-edit
              </Label>
            </div>
            {availableAutoEditTiers.map(tier => (
              <div key={tier.id} className="flex items-center space-x-3">
                <RadioGroupItem value={tier.tier_name} id={`autoedit-${tier.tier_name}`} />
                <Label htmlFor={`autoedit-${tier.tier_name}`} className="flex-1 cursor-pointer">
                  <span className="font-medium">{tier.tier_name}</span>
                  <span className="text-muted-foreground ml-2">
                    +${Number(tier.hourly_amount)}/hr
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Editing Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Film className="h-4 w-4" />
            Editing Services
          </CardTitle>
          <CardDescription>
            Add professional editing to your session
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {editingMenu?.map(item => {
            const isSelected = selection.editingItems.some(e => e.id === item.id);
            return (
              <div 
                key={item.id} 
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={isSelected}
                    onCheckedChange={() => toggleEditingItem(item)}
                  />
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <span className="text-sm font-medium">
                  ${Number(item.base_price)}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

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
        <Button variant="outline" onClick={() => setCurrentStep(4)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleNext}>
          View Summary
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

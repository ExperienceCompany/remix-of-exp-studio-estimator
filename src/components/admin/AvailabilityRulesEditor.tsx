import { useState } from 'react';
import { Plus, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  useAvailabilityRules,
  useCreateAvailabilityRule,
  useUpdateAvailabilityRule,
  useDeleteAvailabilityRule,
} from '@/hooks/useAvailabilityRules';
import { useAllStudios } from '@/hooks/useStudiosAdmin';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const time24 = `${hour.toString().padStart(2, '0')}:${minute}`;
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const time12 = `${hour12}:${minute} ${period}`;
  return { value: time24, label: time12 };
});

export default function AvailabilityRulesEditor() {
  const { data: rules, isLoading: rulesLoading } = useAvailabilityRules();
  const { data: studios, isLoading: studiosLoading } = useAllStudios();
  const createRule = useCreateAvailabilityRule();
  const updateRule = useUpdateAvailabilityRule();
  const deleteRule = useDeleteAvailabilityRule();

  const activeStudios = studios?.filter(s => s.is_active) || [];

  const handleAddRule = async () => {
    try {
      await createRule.mutateAsync({
        studio_ids: activeStudios.map(s => s.id),
        start_time: '10:00',
        end_time: '22:00',
        days_of_week: [1, 2, 3, 4, 5], // Mon-Fri
        is_active: true,
      });
      toast.success('Availability rule added');
    } catch (error) {
      toast.error('Failed to add rule');
    }
  };

  const handleUpdateRule = async (
    id: string,
    updates: { studio_ids?: string[]; start_time?: string; end_time?: string; days_of_week?: number[] }
  ) => {
    try {
      await updateRule.mutateAsync({ id, ...updates });
    } catch (error) {
      toast.error('Failed to update rule');
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteRule.mutateAsync(id);
      toast.success('Availability rule deleted');
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  const toggleStudio = (ruleId: string, currentStudioIds: string[], studioId: string) => {
    const newStudioIds = currentStudioIds.includes(studioId)
      ? currentStudioIds.filter(id => id !== studioId)
      : [...currentStudioIds, studioId];
    
    if (newStudioIds.length === 0) {
      toast.error('At least one studio must be selected');
      return;
    }
    
    handleUpdateRule(ruleId, { studio_ids: newStudioIds });
  };

  const toggleDay = (ruleId: string, currentDays: number[], day: number) => {
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();
    
    if (newDays.length === 0) {
      toast.error('At least one day must be selected');
      return;
    }
    
    handleUpdateRule(ruleId, { days_of_week: newDays });
  };

  const getStudioName = (studioId: string) => {
    return studios?.find(s => s.id === studioId)?.name || 'Unknown';
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  if (rulesLoading || studiosLoading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Hours of Availability</h2>
          <p className="text-sm text-muted-foreground">
            Define when studios can be booked
          </p>
        </div>
        <Button onClick={handleAddRule} size="sm" disabled={createRule.isPending}>
          <Plus className="h-4 w-4 mr-2" />
          Add Hours
        </Button>
      </div>

      {rules && rules.length > 0 ? (
        <div className="space-y-4">
          {rules.map(rule => (
            <Card key={rule.id}>
              <CardContent className="pt-4 space-y-4">
                {/* Studios selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Studios</Label>
                  <div className="flex flex-wrap gap-2">
                    {activeStudios.map(studio => (
                      <Badge
                        key={studio.id}
                        variant={rule.studio_ids.includes(studio.id) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleStudio(rule.id, rule.studio_ids, studio.id)}
                      >
                        {studio.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Time range */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Available between</span>
                    <Select
                      value={rule.start_time.slice(0, 5)}
                      onValueChange={(value) => handleUpdateRule(rule.id, { start_time: value })}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">and</span>
                    <Select
                      value={rule.end_time.slice(0, 5)}
                      onValueChange={(value) => handleUpdateRule(rule.id, { end_time: value })}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Days selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Days</Label>
                  <div className="flex gap-2">
                    {DAYS_OF_WEEK.map(day => (
                      <Button
                        key={day.value}
                        variant={rule.days_of_week.includes(day.value) ? 'default' : 'outline'}
                        size="sm"
                        className="w-12"
                        onClick={() => toggleDay(rule.id, rule.days_of_week, day.value)}
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Delete button */}
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRule(rule.id)}
                    disabled={deleteRule.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No availability rules configured</p>
            <p className="text-sm">Studios will use calendar settings operating hours</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Save } from 'lucide-react';
import { useDiyRates, useStudios, useTimeSlots } from '@/hooks/useEstimatorData';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export function RatesEditor() {
  const { data: rates, isLoading } = useDiyRates();
  const { data: studios } = useStudios();
  const { data: timeSlots } = useTimeSlots();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editedRates, setEditedRates] = useState<Record<string, { first: string; after: string }>>({});

  const getStudioName = (studioId: string) => {
    return studios?.find(s => s.id === studioId)?.name || studioId;
  };

  const getTimeSlotName = (slotId: string) => {
    return timeSlots?.find(t => t.id === slotId)?.display_name || slotId;
  };

  const handleRateChange = (rateId: string, field: 'first' | 'after', value: string) => {
    const currentRate = rates?.find(r => r.id === rateId);
    
    setEditedRates(prev => {
      // Initialize with current values if first edit for this rate
      const existing = prev[rateId] ?? {
        first: String(currentRate?.first_hour_rate ?? ''),
        after: String(currentRate?.after_first_hour_rate ?? ''),
      };
      
      return {
        ...prev,
        [rateId]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const handleSaveRate = async (rateId: string) => {
    const edited = editedRates[rateId];
    if (!edited) return;

    const { error } = await supabase
      .from('diy_rates')
      .update({
        first_hour_rate: parseFloat(edited.first) || 0,
        after_first_hour_rate: edited.after ? parseFloat(edited.after) : null,
      })
      .eq('id', rateId);

    if (error) {
      toast({ title: 'Error saving rate', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Rate updated!' });
      queryClient.invalidateQueries({ queryKey: ['diy_rates'] });
      setEditedRates(prev => {
        const next = { ...prev };
        delete next[rateId];
        return next;
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading rates...</div>;
  }

  // Group rates by studio
  const groupedRates = rates?.reduce((acc, rate) => {
    const studioId = rate.studio_id;
    if (!acc[studioId]) acc[studioId] = [];
    acc[studioId].push(rate);
    return acc;
  }, {} as Record<string, typeof rates>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedRates || {}).map(([studioId, studioRates]) => (
        <Card key={studioId}>
          <CardHeader>
            <CardTitle className="text-lg">{getStudioName(studioId)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time Slot</TableHead>
                  <TableHead>First Hour ($)</TableHead>
                  <TableHead>After First Hour ($)</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studioRates?.map(rate => {
                  const edited = editedRates[rate.id];
                  const hasChanges = !!edited;

                  return (
                    <TableRow key={rate.id}>
                      <TableCell>{getTimeSlotName(rate.time_slot_id)}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={edited?.first ?? rate.first_hour_rate}
                          onChange={(e) => handleRateChange(rate.id, 'first', e.target.value)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={edited?.after ?? (rate.after_first_hour_rate || '')}
                          onChange={(e) => handleRateChange(rate.id, 'after', e.target.value)}
                          placeholder="—"
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        {hasChanges && (
                          <Button size="sm" onClick={() => handleSaveRate(rate.id)}>
                            <Save className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

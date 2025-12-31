import { Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  useSchedulerDisplaySettings,
  useUpdateSchedulerDisplaySettings,
} from '@/hooks/useSchedulerSettings';

const TIME_OPTIONS = Array.from({ length: 49 }, (_, i) => {
  if (i === 48) return { value: '24:00', label: 'Midnight (End)' };
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const time24 = `${hour.toString().padStart(2, '0')}:${minute}`;
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const time12 = `${hour12}:${minute} ${period}`;
  return { value: time24, label: time12 };
});

export default function SchedulerDisplayEditor() {
  const { data: settings, isLoading } = useSchedulerDisplaySettings();
  const updateSettings = useUpdateSchedulerDisplaySettings();

  const handleUpdate = async (field: 'display_start_time' | 'display_end_time', value: string) => {
    if (!settings) return;
    
    try {
      await updateSettings.mutateAsync({
        id: settings.id,
        [field]: value === '24:00' ? '00:00' : value,
      });
      toast.success('Display settings updated');
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Scheduler Display</h2>
        <p className="text-sm text-muted-foreground">
          Configure the visible time range on the calendar
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">Show the hours</span>
            <Select
              value={settings?.display_start_time?.slice(0, 5) || '09:00'}
              onValueChange={(value) => handleUpdate('display_start_time', value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.filter(opt => opt.value !== '24:00').map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm">to</span>
            <Select
              value={settings?.display_end_time === '00:00' ? '24:00' : settings?.display_end_time?.slice(0, 5) || '24:00'}
              onValueChange={(value) => handleUpdate('display_end_time', value)}
            >
              <SelectTrigger className="w-36">
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
            <span className="text-sm">on the scheduler time axis.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

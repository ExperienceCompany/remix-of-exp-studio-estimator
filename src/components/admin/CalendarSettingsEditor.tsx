import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Clock, Save, Plus, X } from 'lucide-react';
import { useStudios } from '@/hooks/useEstimatorData';
import { useCalendarSettings, useUpdateCalendarSettings } from '@/hooks/useCalendarSettings';
import { useBlockedDates, useCreateBlockedDate, useDeleteBlockedDate, BlockedDate } from '@/hooks/useStudioBookings';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function CalendarSettingsEditor() {
  const { data: studios, isLoading: studiosLoading } = useStudios();
  const { data: allSettings, isLoading: settingsLoading } = useCalendarSettings();
  const { data: blockedDates } = useBlockedDates();
  const updateSettings = useUpdateCalendarSettings();
  const createBlockedDate = useCreateBlockedDate();
  const deleteBlockedDate = useDeleteBlockedDate();
  const { toast } = useToast();

  const [selectedStudioId, setSelectedStudioId] = useState<string>('');
  const [editedSettings, setEditedSettings] = useState<Record<string, string | number | boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [newBlockedReason, setNewBlockedReason] = useState('');

  // Get settings for selected studio
  const selectedSettings = allSettings?.find(s => s.studio_id === selectedStudioId);
  const studioBlockedDates = blockedDates?.filter(
    bd => bd.studio_id === selectedStudioId || bd.studio_id === null
  );

  // Set first studio as default when loaded
  useEffect(() => {
    if (studios?.length && !selectedStudioId) {
      setSelectedStudioId(studios[0].id);
    }
  }, [studios, selectedStudioId]);

  // Reset edited settings when studio changes
  useEffect(() => {
    if (selectedSettings) {
      setEditedSettings({
        time_increment_minutes: selectedSettings.time_increment_minutes,
        buffer_minutes: selectedSettings.buffer_minutes,
        min_booking_hours: selectedSettings.min_booking_hours,
        max_booking_hours: selectedSettings.max_booking_hours,
        advance_booking_days: selectedSettings.advance_booking_days,
        operating_start_time: selectedSettings.operating_start_time,
        operating_end_time: selectedSettings.operating_end_time,
        is_active: selectedSettings.is_active,
      });
      setHasChanges(false);
    }
  }, [selectedSettings]);

  const handleChange = (key: string, value: string | number | boolean) => {
    setEditedSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedSettings) return;

    try {
      await updateSettings.mutateAsync({
        id: selectedSettings.id,
        time_increment_minutes: Number(editedSettings.time_increment_minutes),
        buffer_minutes: Number(editedSettings.buffer_minutes),
        min_booking_hours: Number(editedSettings.min_booking_hours),
        max_booking_hours: Number(editedSettings.max_booking_hours),
        advance_booking_days: Number(editedSettings.advance_booking_days),
        operating_start_time: String(editedSettings.operating_start_time),
        operating_end_time: String(editedSettings.operating_end_time),
        is_active: Boolean(editedSettings.is_active),
      });
      toast({ title: 'Settings saved!' });
      setHasChanges(false);
    } catch (error) {
      toast({ title: 'Error saving settings', variant: 'destructive' });
    }
  };

  const handleAddBlockedDate = async () => {
    if (!newBlockedDate) return;

    try {
      await createBlockedDate.mutateAsync({
        studio_id: selectedStudioId || null,
        blocked_date: newBlockedDate,
        reason: newBlockedReason || null,
      });
      toast({ title: 'Blocked date added!' });
      setNewBlockedDate('');
      setNewBlockedReason('');
    } catch (error) {
      toast({ title: 'Error adding blocked date', variant: 'destructive' });
    }
  };

  const handleDeleteBlockedDate = async (id: string) => {
    try {
      await deleteBlockedDate.mutateAsync(id);
      toast({ title: 'Blocked date removed!' });
    } catch (error) {
      toast({ title: 'Error removing blocked date', variant: 'destructive' });
    }
  };

  if (studiosLoading || settingsLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  const selectedStudio = studios?.find(s => s.id === selectedStudioId);

  return (
    <div className="space-y-6">
      {/* Studio Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Settings
          </CardTitle>
          <CardDescription>
            Configure booking calendar settings for each studio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Select Studio</Label>
            <Select value={selectedStudioId} onValueChange={setSelectedStudioId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a studio" />
              </SelectTrigger>
              <SelectContent>
                {studios?.map(studio => (
                  <SelectItem key={studio.id} value={studio.id}>
                    {studio.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedSettings && (
        <>
          {/* Operating Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Operating Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Opens At</Label>
                  <Input
                    type="time"
                    value={String(editedSettings.operating_start_time || '10:00')}
                    onChange={(e) => handleChange('operating_start_time', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Closes At</Label>
                  <Input
                    type="time"
                    value={String(editedSettings.operating_end_time || '22:00')}
                    onChange={(e) => handleChange('operating_end_time', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label>Booking Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow customers to book this studio
                  </p>
                </div>
                <Switch
                  checked={Boolean(editedSettings.is_active)}
                  onCheckedChange={(checked) => handleChange('is_active', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Booking Increments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Booking Increments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Time Slots</Label>
                  <Select
                    value={String(editedSettings.time_increment_minutes)}
                    onValueChange={(v) => handleChange('time_increment_minutes', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Buffer Between Bookings</Label>
                  <Select
                    value={String(editedSettings.buffer_minutes)}
                    onValueChange={(v) => handleChange('buffer_minutes', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No buffer</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Booking Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Min Duration</Label>
                  <Select
                    value={String(editedSettings.min_booking_hours)}
                    onValueChange={(v) => handleChange('min_booking_hours', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="2">2 hours</SelectItem>
                      <SelectItem value="3">3 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Max Duration</Label>
                  <Select
                    value={String(editedSettings.max_booking_hours)}
                    onValueChange={(v) => handleChange('max_booking_hours', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 hours</SelectItem>
                      <SelectItem value="6">6 hours</SelectItem>
                      <SelectItem value="8">8 hours</SelectItem>
                      <SelectItem value="10">10 hours</SelectItem>
                      <SelectItem value="12">12 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Advance Booking</Label>
                  <Select
                    value={String(editedSettings.advance_booking_days)}
                    onValueChange={(v) => handleChange('advance_booking_days', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateSettings.isPending}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
          </Button>

          {/* Blocked Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Blocked Dates</CardTitle>
              <CardDescription>
                Block specific dates when {selectedStudio?.name} is unavailable
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newBlockedDate}
                  onChange={(e) => setNewBlockedDate(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Reason (optional)"
                  value={newBlockedReason}
                  onChange={(e) => setNewBlockedReason(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddBlockedDate} disabled={!newBlockedDate}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {studioBlockedDates && studioBlockedDates.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studioBlockedDates.map((bd) => (
                      <TableRow key={bd.id}>
                        <TableCell>{format(new Date(bd.blocked_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{bd.reason || '—'}</TableCell>
                        <TableCell>
                          {bd.studio_id === null ? 'All Studios' : selectedStudio?.name}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBlockedDate(bd.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No blocked dates configured
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

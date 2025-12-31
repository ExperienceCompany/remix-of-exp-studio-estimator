import { Calendar } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  useAllDayDefaults,
  useUpsertAllDayDefault,
  useDeleteAllDayDefault,
} from '@/hooks/useSchedulerSettings';
import { useAllStudios } from '@/hooks/useStudiosAdmin';

export default function AllDayDefaultsEditor() {
  const { data: defaults, isLoading: defaultsLoading } = useAllDayDefaults();
  const { data: studios, isLoading: studiosLoading } = useAllStudios();
  const upsertDefault = useUpsertAllDayDefault();
  const deleteDefault = useDeleteAllDayDefault();

  const activeStudios = studios?.filter(s => s.is_active) || [];

  const getStudioDefault = (studioId: string) => {
    return defaults?.find(d => d.studio_id === studioId);
  };

  const handleToggleShowCheckbox = async (studioId: string, show: boolean) => {
    try {
      if (show) {
        await upsertDefault.mutateAsync({
          studio_id: studioId,
          show_all_day_checkbox: true,
          checked_by_default: false,
        });
      } else {
        await deleteDefault.mutateAsync(studioId);
      }
    } catch (error) {
      toast.error('Failed to update setting');
    }
  };

  const handleToggleCheckedByDefault = async (studioId: string, checked: boolean) => {
    try {
      await upsertDefault.mutateAsync({
        studio_id: studioId,
        show_all_day_checkbox: true,
        checked_by_default: checked,
      });
    } catch (error) {
      toast.error('Failed to update setting');
    }
  };

  if (defaultsLoading || studiosLoading) {
    return <div className="p-4">Loading...</div>;
  }

  const studiosWithCheckbox = activeStudios.filter(s => getStudioDefault(s.id)?.show_all_day_checkbox);
  const studiosWithCheckedDefault = activeStudios.filter(s => getStudioDefault(s.id)?.checked_by_default);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">All-Day Booking Defaults</h2>
        <p className="text-sm text-muted-foreground">
          Configure which studios show an "All Day" checkbox on booking forms
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Show All-Day Checkbox
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Select which studios should show an "All Day" checkbox on booking forms:
          </p>
          <div className="grid grid-cols-2 gap-2 p-3 border rounded-md">
            {activeStudios.map(studio => {
              const studioDefault = getStudioDefault(studio.id);
              return (
                <div key={studio.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`show-${studio.id}`}
                    checked={studioDefault?.show_all_day_checkbox || false}
                    onCheckedChange={(checked) => handleToggleShowCheckbox(studio.id, !!checked)}
                  />
                  <label
                    htmlFor={`show-${studio.id}`}
                    className="text-sm cursor-pointer"
                  >
                    {studio.name}
                  </label>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {studiosWithCheckbox.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Checked by Default
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              For studios with the All-Day checkbox, select which ones should have it checked by default:
            </p>
            <div className="grid grid-cols-2 gap-2 p-3 border rounded-md">
              {studiosWithCheckbox.map(studio => {
                const studioDefault = getStudioDefault(studio.id);
                return (
                  <div key={studio.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`default-${studio.id}`}
                      checked={studioDefault?.checked_by_default || false}
                      onCheckedChange={(checked) => handleToggleCheckedByDefault(studio.id, !!checked)}
                    />
                    <label
                      htmlFor={`default-${studio.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {studio.name}
                    </label>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Studios with All-Day option:</span>
              <div className="flex flex-wrap gap-1">
                {studiosWithCheckbox.length > 0 ? (
                  studiosWithCheckbox.map(s => (
                    <Badge key={s.id} variant="secondary">{s.name}</Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">None</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Checked by default:</span>
              <div className="flex flex-wrap gap-1">
                {studiosWithCheckedDefault.length > 0 ? (
                  studiosWithCheckedDefault.map(s => (
                    <Badge key={s.id} variant="default">{s.name}</Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">None</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

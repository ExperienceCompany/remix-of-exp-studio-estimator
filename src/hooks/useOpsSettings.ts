import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OpsSettings {
  monthly_rent: number;
  monthly_utilities: number;
  monthly_insurance: number;
  monthly_other: number;
  operating_hours_per_month: number;
}

interface OpsSettingsRow {
  id: string;
  setting_key: string;
  setting_value: number;
  description: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export function useOpsSettings() {
  const queryClient = useQueryClient();

  const { data: rawSettings, isLoading, error } = useQuery({
    queryKey: ['ops_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_settings')
        .select('*');
      
      if (error) throw error;
      return data as OpsSettingsRow[];
    },
  });

  // Transform raw rows into a settings object
  const settings: OpsSettings = {
    monthly_rent: 0,
    monthly_utilities: 0,
    monthly_insurance: 0,
    monthly_other: 0,
    operating_hours_per_month: 240,
  };

  rawSettings?.forEach((row) => {
    if (row.setting_key in settings) {
      settings[row.setting_key as keyof OpsSettings] = Number(row.setting_value);
    }
  });

  // Computed values
  const totalMonthlyExpenses = 
    settings.monthly_rent + 
    settings.monthly_utilities + 
    settings.monthly_insurance + 
    settings.monthly_other;

  const hourlyOverheadRate = settings.operating_hours_per_month > 0 
    ? totalMonthlyExpenses / settings.operating_hours_per_month 
    : 0;

  // Update mutation
  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: number }) => {
      const { error } = await supabase
        .from('ops_settings')
        .update({ setting_value: value, updated_at: new Date().toISOString() })
        .eq('setting_key', key);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_settings'] });
    },
  });

  // Bulk update
  const updateAllSettings = async (newSettings: Partial<OpsSettings>) => {
    const updates = Object.entries(newSettings).map(([key, value]) => 
      updateSetting.mutateAsync({ key, value: value as number })
    );
    await Promise.all(updates);
  };

  return {
    settings,
    rawSettings,
    isLoading,
    error,
    totalMonthlyExpenses,
    hourlyOverheadRate,
    updateSetting: updateSetting.mutate,
    updateAllSettings,
    isUpdating: updateSetting.isPending,
  };
}

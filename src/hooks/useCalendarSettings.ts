import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CalendarSettings {
  id: string;
  studio_id: string;
  time_increment_minutes: number;
  buffer_minutes: number;
  min_booking_hours: number;
  max_booking_hours: number;
  advance_booking_days: number;
  operating_start_time: string;
  operating_end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCalendarSettings() {
  return useQuery({
    queryKey: ['calendar_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_settings')
        .select('*')
        .order('studio_id');
      
      if (error) throw error;
      return data as CalendarSettings[];
    },
  });
}

export function useCalendarSettingsByStudio(studioId: string | undefined) {
  return useQuery({
    queryKey: ['calendar_settings', studioId],
    queryFn: async () => {
      if (!studioId) return null;
      
      const { data, error } = await supabase
        .from('calendar_settings')
        .select('*')
        .eq('studio_id', studioId)
        .maybeSingle();
      
      if (error) throw error;
      return data as CalendarSettings | null;
    },
    enabled: !!studioId,
  });
}

export function useUpdateCalendarSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CalendarSettings> & { id: string }) => {
      const { data, error } = await supabase
        .from('calendar_settings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar_settings'] });
    },
  });
}

export function useCreateCalendarSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Omit<CalendarSettings, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('calendar_settings')
        .insert(settings)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar_settings'] });
    },
  });
}

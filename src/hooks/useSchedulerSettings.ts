import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SchedulerDisplaySettings {
  id: string;
  display_start_time: string;
  display_end_time: string;
  created_at: string;
  updated_at: string;
}

export interface AllDayDefault {
  id: string;
  studio_id: string;
  show_all_day_checkbox: boolean;
  checked_by_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccessControlSettings {
  id: string;
  schedule_visibility: 'public' | 'private';
  booking_permission: 'everyone' | 'tagged_users';
  allowed_booking_tags: string[];
  created_at: string;
  updated_at: string;
}

export function useSchedulerDisplaySettings() {
  return useQuery({
    queryKey: ['scheduler_display_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduler_display_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      return data as SchedulerDisplaySettings;
    },
  });
}

export function useUpdateSchedulerDisplaySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SchedulerDisplaySettings> & { id: string }) => {
      const { data, error } = await supabase
        .from('scheduler_display_settings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler_display_settings'] });
    },
  });
}

export function useAllDayDefaults() {
  return useQuery({
    queryKey: ['all_day_defaults'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('all_day_defaults')
        .select('*');
      
      if (error) throw error;
      return data as AllDayDefault[];
    },
  });
}

export function useUpsertAllDayDefault() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (defaults: Omit<AllDayDefault, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('all_day_defaults')
        .upsert(defaults, { onConflict: 'studio_id' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_day_defaults'] });
    },
  });
}

export function useDeleteAllDayDefault() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studioId: string) => {
      const { error } = await supabase
        .from('all_day_defaults')
        .delete()
        .eq('studio_id', studioId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_day_defaults'] });
    },
  });
}

export function useAccessControlSettings() {
  return useQuery({
    queryKey: ['access_control_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_control_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      return data as AccessControlSettings;
    },
  });
}

export function useUpdateAccessControlSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AccessControlSettings> & { id: string }) => {
      const { data, error } = await supabase
        .from('access_control_settings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access_control_settings'] });
    },
  });
}

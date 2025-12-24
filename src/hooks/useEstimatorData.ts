import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useStudios() {
  return useQuery({
    queryKey: ['studios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('studios')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useTimeSlots() {
  return useQuery({
    queryKey: ['time_slots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });
}

export function useDiyRates() {
  return useQuery({
    queryKey: ['diy_rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diy_rates')
        .select(`
          *,
          studios(name, type),
          time_slots(name, type, display_name)
        `)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });
}

export function useProviderLevels() {
  return useQuery({
    queryKey: ['provider_levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_levels')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });
}

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });
}

export function useVodcastCameraAddons() {
  return useQuery({
    queryKey: ['vodcast_camera_addons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vodcast_camera_addons')
        .select('*')
        .eq('is_active', true)
        .order('cameras');
      if (error) throw error;
      return data;
    },
  });
}

export function useVerticalAutoeditAddons() {
  return useQuery({
    queryKey: ['vertical_autoedit_addons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vertical_autoedit_addons')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });
}

export function useEditingMenu() {
  return useQuery({
    queryKey: ['editing_menu'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('editing_menu')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });
}

export function usePackages() {
  return useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
  });
}

export function useSessionAddons() {
  return useQuery({
    queryKey: ['session_addons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_addons')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });
}

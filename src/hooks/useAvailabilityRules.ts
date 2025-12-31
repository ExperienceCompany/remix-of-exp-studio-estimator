import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AvailabilityRule {
  id: string;
  studio_ids: string[];
  start_time: string;
  end_time: string;
  days_of_week: number[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useAvailabilityRules() {
  return useQuery({
    queryKey: ['availability_rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('availability_rules')
        .select('*')
        .order('created_at');
      
      if (error) throw error;
      return data as AvailabilityRule[];
    },
  });
}

export function useCreateAvailabilityRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: Omit<AvailabilityRule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('availability_rules')
        .insert(rule)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability_rules'] });
    },
  });
}

export function useUpdateAvailabilityRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AvailabilityRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('availability_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability_rules'] });
    },
  });
}

export function useDeleteAvailabilityRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('availability_rules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability_rules'] });
    },
  });
}

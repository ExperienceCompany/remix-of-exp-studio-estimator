import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface ColorCondition {
  type?: 'and' | 'or'; // undefined for first condition
  field: 'booking_type' | 'title' | 'payment_status' | 'holder_name' | 'holder_tags' | 'session_type';
  operator: 'is_equal_to' | 'is_not_equal_to' | 'contains' | 'does_not_contain';
  value: string;
}

export interface BookingColorRule {
  id: string;
  color: string;
  conditions: ColorCondition[];
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useBookingColorRules() {
  return useQuery({
    queryKey: ['booking_color_rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_color_rules')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        conditions: row.conditions as unknown as ColorCondition[],
      })) as BookingColorRule[];
    },
  });
}

export function useCreateBookingColorRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: Omit<BookingColorRule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('booking_color_rules')
        .insert({
          ...rule,
          conditions: rule.conditions as unknown as Json,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking_color_rules'] });
    },
  });
}

export function useUpdateBookingColorRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BookingColorRule> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.conditions) {
        updateData.conditions = updates.conditions as unknown as Json;
      }
      const { data, error } = await supabase
        .from('booking_color_rules')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking_color_rules'] });
    },
  });
}

export function useDeleteBookingColorRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('booking_color_rules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking_color_rules'] });
    },
  });
}

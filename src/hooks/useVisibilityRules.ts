import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserVisibilityRule {
  id: string;
  viewer_type: 'any_user' | 'users_with_tags';
  viewer_tags: string[];
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BookingVisibilityRule {
  id: string;
  viewer_type: 'any_user' | 'users_with_tags';
  viewer_tags: string[];
  space_filter: 'any_space' | 'specific_spaces';
  space_ids: string[];
  holder_filter: 'any_or_no_user' | 'users_with_tags';
  holder_tags: string[];
  booking_type_filter: 'any' | 'user' | 'internal' | 'unavailable';
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useUserVisibilityRules() {
  return useQuery({
    queryKey: ['user_visibility_rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_visibility_rules')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data as UserVisibilityRule[];
    },
  });
}

export function useCreateUserVisibilityRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: Omit<UserVisibilityRule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('user_visibility_rules')
        .insert(rule)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_visibility_rules'] });
    },
  });
}

export function useUpdateUserVisibilityRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UserVisibilityRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('user_visibility_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_visibility_rules'] });
    },
  });
}

export function useDeleteUserVisibilityRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_visibility_rules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_visibility_rules'] });
    },
  });
}

export function useBookingVisibilityRules() {
  return useQuery({
    queryKey: ['booking_visibility_rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_visibility_rules')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data as BookingVisibilityRule[];
    },
  });
}

export function useCreateBookingVisibilityRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: Omit<BookingVisibilityRule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('booking_visibility_rules')
        .insert(rule)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking_visibility_rules'] });
    },
  });
}

export function useUpdateBookingVisibilityRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BookingVisibilityRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('booking_visibility_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking_visibility_rules'] });
    },
  });
}

export function useDeleteBookingVisibilityRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('booking_visibility_rules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking_visibility_rules'] });
    },
  });
}

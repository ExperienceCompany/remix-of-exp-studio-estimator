import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BookingPolicy {
  id: string;
  policy_type: 'lock_in' | 'repeat_bookings';
  policy_value: string;
  hours_before_start: number;
  hours_after_end: number;
  allowed_tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useBookingPolicies() {
  return useQuery({
    queryKey: ['booking_policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_policies')
        .select('*')
        .order('policy_type');
      
      if (error) throw error;
      return data as BookingPolicy[];
    },
  });
}

export function useLockInPolicy() {
  return useQuery({
    queryKey: ['booking_policies', 'lock_in'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_policies')
        .select('*')
        .eq('policy_type', 'lock_in')
        .maybeSingle();
      
      if (error) throw error;
      return data as BookingPolicy | null;
    },
  });
}

export function useRepeatBookingPolicy() {
  return useQuery({
    queryKey: ['booking_policies', 'repeat_bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_policies')
        .select('*')
        .eq('policy_type', 'repeat_bookings')
        .maybeSingle();
      
      if (error) throw error;
      return data as BookingPolicy | null;
    },
  });
}

export function useUpdateBookingPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BookingPolicy> & { id: string }) => {
      const { data, error } = await supabase
        .from('booking_policies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking_policies'] });
    },
  });
}

export function useAvailableTags() {
  return useQuery({
    queryKey: ['available_tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('tags')
        .not('tags', 'is', null);
      
      if (error) throw error;
      
      // Extract unique tags from all profiles
      const allTags = new Set<string>();
      data.forEach(profile => {
        if (profile.tags) {
          profile.tags.forEach((tag: string) => allTags.add(tag));
        }
      });
      
      return Array.from(allTags).sort();
    },
  });
}

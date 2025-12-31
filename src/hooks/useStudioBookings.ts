import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StudioBooking {
  id: string;
  studio_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  booking_type: 'customer' | 'internal' | 'unavailable';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  notes: string | null;
  details: string | null;
  session_type: string | null;
  quote_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  title: string | null;
  people_count: number | null;
  repeat_series_id: string | null;
  repeat_pattern: string | null;
}

export interface BlockedDate {
  id: string;
  studio_id: string | null;
  blocked_date: string;
  reason: string | null;
  created_at: string;
}

export function useStudioBookings(studioId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['studio_bookings', studioId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('studio_bookings')
        .select('*')
        .neq('status', 'cancelled')
        .order('booking_date')
        .order('start_time');
      
      if (studioId) {
        query = query.eq('studio_id', studioId);
      }
      
      if (startDate) {
        query = query.gte('booking_date', startDate);
      }
      
      if (endDate) {
        query = query.lte('booking_date', endDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as StudioBooking[];
    },
  });
}

export function useBlockedDates(studioId?: string) {
  return useQuery({
    queryKey: ['blocked_dates', studioId],
    queryFn: async () => {
      let query = supabase
        .from('blocked_dates')
        .select('*')
        .order('blocked_date');
      
      if (studioId) {
        query = query.or(`studio_id.eq.${studioId},studio_id.is.null`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as BlockedDate[];
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (booking: Omit<StudioBooking, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('studio_bookings')
        .insert(booking)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio_bookings'] });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StudioBooking> & { id: string }) => {
      const { data, error } = await supabase
        .from('studio_bookings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio_bookings'] });
    },
  });
}

export function useCreateBlockedDate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockedDate: Omit<BlockedDate, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('blocked_dates')
        .insert(blockedDate)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked_dates'] });
    },
  });
}

export function useDeleteBlockedDate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('blocked_dates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked_dates'] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('studio_bookings')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio_bookings'] });
    },
  });
}

// Cancel multiple bookings in a series (this and following)
export function useCancelSeriesFromDate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      seriesId, 
      fromDate 
    }: { 
      seriesId: string; 
      fromDate: string; // yyyy-MM-dd format
    }) => {
      const { data, error } = await supabase
        .from('studio_bookings')
        .update({ status: 'cancelled' })
        .eq('repeat_series_id', seriesId)
        .gte('booking_date', fromDate)
        .neq('status', 'cancelled')
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio_bookings'] });
    },
  });
}

// Cancel entire series
export function useCancelEntireSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (seriesId: string) => {
      const { data, error } = await supabase
        .from('studio_bookings')
        .update({ status: 'cancelled' })
        .eq('repeat_series_id', seriesId)
        .neq('status', 'cancelled')
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio_bookings'] });
    },
  });
}

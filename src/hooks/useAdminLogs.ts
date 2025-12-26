import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type LogType = 'studio_estimate' | 'photo_editing' | 'video_editing' | 'team_project' | 'internal_ops';

export interface AdminLog {
  id: string;
  log_type: LogType;
  log_name: string | null;
  customer_total: number | null;
  provider_payout: number | null;
  gross_margin: number | null;
  net_profit: number | null;
  hours: number | null;
  data_json: Record<string, unknown>;
  status: 'active' | 'archived';
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface CreateLogInput {
  log_type: LogType;
  log_name?: string;
  customer_total?: number;
  provider_payout?: number;
  gross_margin?: number;
  net_profit?: number;
  hours?: number;
  affiliate_code?: string | null;
  data_json: Record<string, unknown>;
}

export function useAdminLogs(filter?: LogType | 'all') {
  return useQuery({
    queryKey: ['admin_logs', filter],
    queryFn: async () => {
      let query = supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter && filter !== 'all') {
        query = query.eq('log_type', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AdminLog[];
    },
  });
}

export function useCreateAdminLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateLogInput) => {
      const insertData = {
        log_type: input.log_type as string,
        log_name: input.log_name || null,
        customer_total: input.customer_total || null,
        provider_payout: input.provider_payout || null,
        gross_margin: input.gross_margin || null,
        net_profit: input.net_profit || null,
        hours: input.hours || null,
        affiliate_code: input.affiliate_code || null,
        data_json: input.data_json as unknown as import('@/integrations/supabase/types').Json,
      };

      const { data, error } = await supabase
        .from('admin_logs')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_logs'] });
    },
  });
}

export function useArchiveAdminLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('admin_logs')
        .update({ status: 'archived' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_logs'] });
    },
  });
}

export function useDeleteAdminLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('admin_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_logs'] });
    },
  });
}

export interface UpdateLogInput {
  id: string;
  log_name?: string;
  customer_total?: number;
  provider_payout?: number;
  gross_margin?: number;
  net_profit?: number;
  hours?: number;
  data_json?: Record<string, unknown>;
}

export function useUpdateAdminLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateLogInput) => {
      const { id, ...updates } = input;
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
        data_json: updates.data_json as unknown as import('@/integrations/supabase/types').Json,
      };

      const { data, error } = await supabase
        .from('admin_logs')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_logs'] });
    },
  });
}

export function useAdminLogById(id: string | null) {
  return useQuery({
    queryKey: ['admin_logs', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('admin_logs')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as AdminLog;
    },
    enabled: !!id,
  });
}

export function useAdminLogStats() {
  const { data: logs } = useAdminLogs('all');

  const stats = {
    totalLogs: logs?.length || 0,
    totalRevenue: logs?.reduce((sum, log) => sum + (log.customer_total || 0), 0) || 0,
    totalPayouts: logs?.reduce((sum, log) => sum + (log.provider_payout || 0), 0) || 0,
    totalMargin: logs?.reduce((sum, log) => sum + (log.gross_margin || 0), 0) || 0,
    avgMarginPercent: logs && logs.length > 0
      ? logs.reduce((sum, log) => {
          const total = log.customer_total || 0;
          const margin = log.gross_margin || 0;
          return sum + (total > 0 ? (margin / total) * 100 : 0);
        }, 0) / logs.length
      : 0,
    byType: {
      studio_estimate: logs?.filter(l => l.log_type === 'studio_estimate').length || 0,
      photo_editing: logs?.filter(l => l.log_type === 'photo_editing').length || 0,
      video_editing: logs?.filter(l => l.log_type === 'video_editing').length || 0,
      team_project: logs?.filter(l => l.log_type === 'team_project').length || 0,
      internal_ops: logs?.filter(l => l.log_type === 'internal_ops').length || 0,
    },
  };

  return stats;
}

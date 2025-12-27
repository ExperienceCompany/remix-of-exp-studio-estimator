import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomBookingField {
  id: string;
  field_type: string;
  field_label: string;
  field_nickname: string;
  field_placeholder: string | null;
  field_options: string[] | null;
  field_help_text: string | null;
  is_required: boolean;
  is_admin_only: boolean;
  min_selections: number | null;
  max_selections: number | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldCondition {
  id: string;
  field_id: string;
  condition_group: number;
  condition_field: string;
  condition_operator: string;
  condition_values: string[];
  created_at: string;
}

export function useCustomBookingFields() {
  return useQuery({
    queryKey: ['custom_booking_fields'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_booking_fields')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data as CustomBookingField[];
    },
  });
}

export function useCustomField(id: string | undefined) {
  return useQuery({
    queryKey: ['custom_booking_fields', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('custom_booking_fields')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as CustomBookingField | null;
    },
    enabled: !!id,
  });
}

export function useFieldConditions(fieldId: string | undefined) {
  return useQuery({
    queryKey: ['custom_field_conditions', fieldId],
    queryFn: async () => {
      if (!fieldId) return [];
      
      const { data, error } = await supabase
        .from('custom_field_conditions')
        .select('*')
        .eq('field_id', fieldId)
        .order('condition_group')
        .order('created_at');
      
      if (error) throw error;
      return data as CustomFieldCondition[];
    },
    enabled: !!fieldId,
  });
}

export function useCreateCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (field: Omit<CustomBookingField, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('custom_booking_fields')
        .insert(field)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom_booking_fields'] });
    },
  });
}

export function useUpdateCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CustomBookingField> & { id: string }) => {
      const { data, error } = await supabase
        .from('custom_booking_fields')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom_booking_fields'] });
    },
  });
}

export function useDeleteCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_booking_fields')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom_booking_fields'] });
    },
  });
}

export function useUpdateFieldConditions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      fieldId, 
      conditions 
    }: { 
      fieldId: string; 
      conditions: Omit<CustomFieldCondition, 'id' | 'created_at'>[] 
    }) => {
      // Delete existing conditions
      const { error: deleteError } = await supabase
        .from('custom_field_conditions')
        .delete()
        .eq('field_id', fieldId);
      
      if (deleteError) throw deleteError;

      // Insert new conditions if any
      if (conditions.length > 0) {
        const { error: insertError } = await supabase
          .from('custom_field_conditions')
          .insert(conditions);
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, { fieldId }) => {
      queryClient.invalidateQueries({ queryKey: ['custom_field_conditions', fieldId] });
    },
  });
}

export function useUpdateFieldOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fields: { id: string; display_order: number }[]) => {
      for (const field of fields) {
        const { error } = await supabase
          .from('custom_booking_fields')
          .update({ display_order: field.display_order })
          .eq('id', field.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom_booking_fields'] });
    },
  });
}

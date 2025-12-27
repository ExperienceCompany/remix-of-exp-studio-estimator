import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StudioAdmin {
  id: string;
  name: string;
  description: string | null;
  type: 'multimedia_studio' | 'audio_studio' | 'podcast_room' | 'digital_edit_studio' | 'full_studio_buyout';
  is_active: boolean | null;
  thumbnail_url: string | null;
  calendar_color: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useAllStudios() {
  return useQuery({
    queryKey: ['studios_admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('studios')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as StudioAdmin[];
    },
  });
}

export function useUpdateStudio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StudioAdmin> & { id: string }) => {
      const { data, error } = await supabase
        .from('studios')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studios_admin'] });
      queryClient.invalidateQueries({ queryKey: ['studios'] });
    },
  });
}

export function useCreateStudio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studio: Omit<StudioAdmin, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('studios')
        .insert(studio)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studios_admin'] });
      queryClient.invalidateQueries({ queryKey: ['studios'] });
    },
  });
}

export function useUploadStudioImage() {
  return useMutation({
    mutationFn: async ({ file, studioId }: { file: File; studioId: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${studioId}-${Date.now()}.${fileExt}`;
      const filePath = `thumbnails/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('studio-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('studio-images')
        .getPublicUrl(filePath);

      return publicUrl;
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  organization: string | null;
  tags: string[] | null;
  affiliate_code: string | null;
  lead_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export function useProfiles(searchTerm?: string) {
  return useQuery({
    queryKey: ['profiles', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true, nullsFirst: false });
      
      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        query = query.or(
          `full_name.ilike.%${term}%,email.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%,organization.ilike.%${term}%`
        );
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'affiliate_code' | 'lead_count'> & { id?: string }) => {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: profile.id || crypto.randomUUID(),
          email: profile.email,
          full_name: profile.full_name,
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          organization: profile.organization,
          tags: profile.tags,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

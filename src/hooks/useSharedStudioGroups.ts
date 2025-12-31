import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SharedStudioGroup {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface SharedStudioGroupMember {
  id: string;
  group_id: string;
  studio_id: string;
  created_at: string;
}

export interface SharedStudioGroupWithMembers extends SharedStudioGroup {
  members: SharedStudioGroupMember[];
}

export function useSharedStudioGroups() {
  return useQuery({
    queryKey: ['shared_studio_groups'],
    queryFn: async () => {
      const { data: groups, error: groupsError } = await supabase
        .from('shared_studio_groups')
        .select('*')
        .order('name');
      
      if (groupsError) throw groupsError;

      const { data: members, error: membersError } = await supabase
        .from('shared_studio_group_members')
        .select('*');
      
      if (membersError) throw membersError;

      const groupsWithMembers: SharedStudioGroupWithMembers[] = (groups || []).map(group => ({
        ...group,
        members: (members || []).filter(m => m.group_id === group.id)
      }));

      return groupsWithMembers;
    },
  });
}

export function useCreateSharedStudioGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, studioIds }: { name: string; studioIds: string[] }) => {
      const { data: group, error: groupError } = await supabase
        .from('shared_studio_groups')
        .insert({ name })
        .select()
        .single();
      
      if (groupError) throw groupError;

      if (studioIds.length > 0) {
        const members = studioIds.map(studioId => ({
          group_id: group.id,
          studio_id: studioId
        }));

        const { error: membersError } = await supabase
          .from('shared_studio_group_members')
          .insert(members);
        
        if (membersError) throw membersError;
      }

      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared_studio_groups'] });
    },
  });
}

export function useUpdateSharedStudioGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, studioIds }: { id: string; name: string; studioIds: string[] }) => {
      const { error: updateError } = await supabase
        .from('shared_studio_groups')
        .update({ name })
        .eq('id', id);
      
      if (updateError) throw updateError;

      // Delete existing members
      const { error: deleteError } = await supabase
        .from('shared_studio_group_members')
        .delete()
        .eq('group_id', id);
      
      if (deleteError) throw deleteError;

      // Insert new members
      if (studioIds.length > 0) {
        const members = studioIds.map(studioId => ({
          group_id: id,
          studio_id: studioId
        }));

        const { error: membersError } = await supabase
          .from('shared_studio_group_members')
          .insert(members);
        
        if (membersError) throw membersError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared_studio_groups'] });
    },
  });
}

export function useDeleteSharedStudioGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shared_studio_groups')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared_studio_groups'] });
    },
  });
}

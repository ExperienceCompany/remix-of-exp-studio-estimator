import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Save, Trash2, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole | null;
  role_id: string | null;
}

const ROLE_OPTIONS: AppRole[] = ['admin', 'staff', 'affiliate', 'user'];

const getRoleBadgeVariant = (role: AppRole | null): 'default' | 'secondary' | 'outline' => {
  switch (role) {
    case 'admin':
      return 'default';
    case 'staff':
      return 'secondary';
    case 'affiliate':
      return 'secondary';
    default:
      return 'outline';
  }
};

export function UsersEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editedRoles, setEditedRoles] = useState<Record<string, AppRole | 'none'>>({});

  // Fetch all profiles with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = profiles.map(profile => {
        const userRole = roles.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: userRole?.role || null,
          role_id: userRole?.id || null,
        };
      });

      return usersWithRoles;
    },
  });

  // Mutation to update/create role
  const updateRole = useMutation({
    mutationFn: async ({ userId, role, existingRoleId }: { userId: string; role: AppRole | 'none'; existingRoleId: string | null }) => {
      if (role === 'none') {
        // Delete the role
        if (existingRoleId) {
          const { error } = await supabase
            .from('user_roles')
            .delete()
            .eq('id', existingRoleId);
          if (error) throw error;
        }
      } else if (existingRoleId) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('id', existingRoleId);
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Role updated successfully!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating role', description: error.message, variant: 'destructive' });
    },
  });

  const handleRoleChange = (userId: string, role: AppRole | 'none') => {
    setEditedRoles(prev => ({ ...prev, [userId]: role }));
  };

  const handleSaveRole = (user: UserWithRole) => {
    const newRole = editedRoles[user.id];
    if (newRole === undefined) return;

    updateRole.mutate({
      userId: user.id,
      role: newRole,
      existingRoleId: user.role_id,
    });

    setEditedRoles(prev => {
      const next = { ...prev };
      delete next[user.id];
      return next;
    });
  };

  const handleRemoveRole = (user: UserWithRole) => {
    if (!user.role_id) return;

    updateRole.mutate({
      userId: user.id,
      role: 'none',
      existingRoleId: user.role_id,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Management
        </CardTitle>
        <CardDescription>
          Manage user roles and permissions. Changes take effect immediately.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Current Role</TableHead>
              <TableHead>Assign Role</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users?.map(user => {
                const editedRole = editedRoles[user.id];
                const hasChanges = editedRole !== undefined;
                const currentRole = user.role;

                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email || '—'}</TableCell>
                    <TableCell>{user.full_name || '—'}</TableCell>
                    <TableCell>
                      {currentRole ? (
                        <Badge variant={getRoleBadgeVariant(currentRole)}>
                          {currentRole}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No role</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={editedRole ?? currentRole ?? 'none'}
                        onValueChange={(value) => handleRoleChange(user.id, value as AppRole | 'none')}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— none —</SelectItem>
                          {ROLE_OPTIONS.map(role => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {hasChanges && (
                          <Button
                            size="sm"
                            onClick={() => handleSaveRole(user)}
                            disabled={updateRole.isPending}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                        )}
                        {!hasChanges && user.role && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveRole(user)}
                            disabled={updateRole.isPending}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

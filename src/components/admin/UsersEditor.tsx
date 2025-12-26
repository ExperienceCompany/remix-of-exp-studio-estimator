import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Users, Save, Trash2, UserPlus, Loader2, Link } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  email: string | null;
  full_name: string | null;
  affiliate_code: string | null;
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
  const [editedAffiliateCodes, setEditedAffiliateCodes] = useState<Record<string, string>>({});

  // Fetch all profiles with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, affiliate_code')
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
          affiliate_code: profile.affiliate_code,
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

  // Mutation to update affiliate code
  const updateAffiliateCode = useMutation({
    mutationFn: async ({ userId, affiliateCode }: { userId: string; affiliateCode: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ affiliate_code: affiliateCode.trim() || null })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Affiliate code updated!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating affiliate code', description: error.message, variant: 'destructive' });
    },
  });

  const handleRoleChange = (userId: string, role: AppRole | 'none') => {
    setEditedRoles(prev => ({ ...prev, [userId]: role }));
  };

  const handleAffiliateCodeChange = (userId: string, code: string) => {
    setEditedAffiliateCodes(prev => ({ ...prev, [userId]: code.toUpperCase() }));
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

  const handleSaveAffiliateCode = (user: UserWithRole) => {
    const newCode = editedAffiliateCodes[user.id];
    if (newCode === undefined) return;

    updateAffiliateCode.mutate({
      userId: user.id,
      affiliateCode: newCode,
    });

    setEditedAffiliateCodes(prev => {
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
              <TableHead>Affiliate Code</TableHead>
              <TableHead>Current Role</TableHead>
              <TableHead>Assign Role</TableHead>
              <TableHead className="w-40">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users?.map(user => {
                const editedRole = editedRoles[user.id];
                const editedAffiliateCode = editedAffiliateCodes[user.id];
                const hasRoleChanges = editedRole !== undefined;
                const hasAffiliateCodeChanges = editedAffiliateCode !== undefined;
                const currentRole = user.role;
                const currentAffiliateCode = user.affiliate_code || '';

                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email || '—'}</TableCell>
                    <TableCell>{user.full_name || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          value={editedAffiliateCode ?? currentAffiliateCode}
                          onChange={(e) => handleAffiliateCodeChange(user.id, e.target.value)}
                          placeholder="AFFILIATE-CODE"
                          className="w-32 h-8 uppercase text-xs"
                          maxLength={20}
                        />
                        {hasAffiliateCodeChanges && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveAffiliateCode(user)}
                            disabled={updateAffiliateCode.isPending}
                            className="h-8 px-2"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
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
                        {hasRoleChanges && (
                          <Button
                            size="sm"
                            onClick={() => handleSaveRole(user)}
                            disabled={updateRole.isPending}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                        )}
                        {!hasRoleChanges && user.role && (
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

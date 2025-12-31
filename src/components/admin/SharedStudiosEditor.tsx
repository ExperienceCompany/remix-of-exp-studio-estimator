import { useState } from 'react';
import { Plus, Trash2, Edit2, X, Check, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  useSharedStudioGroups,
  useCreateSharedStudioGroup,
  useUpdateSharedStudioGroup,
  useDeleteSharedStudioGroup,
} from '@/hooks/useSharedStudioGroups';
import { useAllStudios } from '@/hooks/useStudiosAdmin';

export default function SharedStudiosEditor() {
  const { data: groups, isLoading: groupsLoading } = useSharedStudioGroups();
  const { data: studios, isLoading: studiosLoading } = useAllStudios();
  const createGroup = useCreateSharedStudioGroup();
  const updateGroup = useUpdateSharedStudioGroup();
  const deleteGroup = useDeleteSharedStudioGroup();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedStudioIds, setSelectedStudioIds] = useState<string[]>([]);

  const activeStudios = studios?.filter(s => s.is_active) || [];

  const handleStartCreate = () => {
    setIsCreating(true);
    setNewGroupName('');
    setSelectedStudioIds([]);
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewGroupName('');
    setSelectedStudioIds([]);
  };

  const handleCreate = async () => {
    if (!newGroupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    if (selectedStudioIds.length < 2) {
      toast.error('Select at least 2 studios for a shared group');
      return;
    }

    try {
      await createGroup.mutateAsync({ name: newGroupName, studioIds: selectedStudioIds });
      toast.success('Shared studio group created');
      handleCancelCreate();
    } catch (error) {
      toast.error('Failed to create group');
    }
  };

  const handleStartEdit = (group: { id: string; name: string; members: { studio_id: string }[] }) => {
    setEditingId(group.id);
    setNewGroupName(group.name);
    setSelectedStudioIds(group.members.map(m => m.studio_id));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewGroupName('');
    setSelectedStudioIds([]);
  };

  const handleUpdate = async (id: string) => {
    if (!newGroupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    if (selectedStudioIds.length < 2) {
      toast.error('Select at least 2 studios for a shared group');
      return;
    }

    try {
      await updateGroup.mutateAsync({ id, name: newGroupName, studioIds: selectedStudioIds });
      toast.success('Shared studio group updated');
      handleCancelEdit();
    } catch (error) {
      toast.error('Failed to update group');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGroup.mutateAsync(id);
      toast.success('Shared studio group deleted');
    } catch (error) {
      toast.error('Failed to delete group');
    }
  };

  const toggleStudio = (studioId: string) => {
    setSelectedStudioIds(prev =>
      prev.includes(studioId)
        ? prev.filter(id => id !== studioId)
        : [...prev, studioId]
    );
  };

  const getStudioName = (studioId: string) => {
    return studios?.find(s => s.id === studioId)?.name || 'Unknown Studio';
  };

  if (groupsLoading || studiosLoading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Shared Studios</h2>
          <p className="text-sm text-muted-foreground">
            Define groups of studios that cannot be booked at the same time
          </p>
        </div>
        {!isCreating && (
          <Button onClick={handleStartCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Group
          </Button>
        )}
      </div>

      {/* Create new group form */}
      {isCreating && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Shared Studio Group</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Group Name</Label>
              <Input
                placeholder="e.g., Main Floor Studios"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Select Studios (min. 2)</Label>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-md max-h-48 overflow-y-auto">
                {activeStudios.map(studio => (
                  <div key={studio.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`create-${studio.id}`}
                      checked={selectedStudioIds.includes(studio.id)}
                      onCheckedChange={() => toggleStudio(studio.id)}
                    />
                    <label
                      htmlFor={`create-${studio.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {studio.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={createGroup.isPending}>
                <Check className="h-4 w-4 mr-2" />
                Create Group
              </Button>
              <Button variant="outline" onClick={handleCancelCreate}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing groups */}
      {groups && groups.length > 0 ? (
        <div className="space-y-3">
          {groups.map(group => (
            <Card key={group.id}>
              <CardContent className="pt-4">
                {editingId === group.id ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Group Name</Label>
                      <Input
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Select Studios (min. 2)</Label>
                      <div className="grid grid-cols-2 gap-2 p-3 border rounded-md max-h-48 overflow-y-auto">
                        {activeStudios.map(studio => (
                          <div key={studio.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-${studio.id}`}
                              checked={selectedStudioIds.includes(studio.id)}
                              onCheckedChange={() => toggleStudio(studio.id)}
                            />
                            <label
                              htmlFor={`edit-${studio.id}`}
                              className="text-sm cursor-pointer"
                            >
                              {studio.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleUpdate(group.id)} disabled={updateGroup.isPending}>
                        <Check className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button variant="outline" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{group.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {group.members.map(member => (
                          <Badge key={member.id} variant="secondary">
                            {getStudioName(member.studio_id)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStartEdit(group)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(group.id)}
                        disabled={deleteGroup.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !isCreating ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No shared studio groups configured</p>
            <p className="text-sm">Create a group to prevent simultaneous bookings</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

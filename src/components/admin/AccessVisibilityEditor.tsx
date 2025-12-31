import { useState } from 'react';
import { Eye, Lock, Users, Plus, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  useAccessControlSettings,
  useUpdateAccessControlSettings,
} from '@/hooks/useSchedulerSettings';
import {
  useUserVisibilityRules,
  useCreateUserVisibilityRule,
  useDeleteUserVisibilityRule,
  useBookingVisibilityRules,
  useCreateBookingVisibilityRule,
  useDeleteBookingVisibilityRule,
} from '@/hooks/useVisibilityRules';
import { useAllStudios } from '@/hooks/useStudiosAdmin';

export default function AccessVisibilityEditor() {
  const { data: accessSettings, isLoading: accessLoading } = useAccessControlSettings();
  const { data: userRules, isLoading: userRulesLoading } = useUserVisibilityRules();
  const { data: bookingRules, isLoading: bookingRulesLoading } = useBookingVisibilityRules();
  const { data: studios } = useAllStudios();
  
  const updateAccessSettings = useUpdateAccessControlSettings();
  const createUserRule = useCreateUserVisibilityRule();
  const deleteUserRule = useDeleteUserVisibilityRule();
  const createBookingRule = useCreateBookingVisibilityRule();
  const deleteBookingRule = useDeleteBookingVisibilityRule();

  const [newTag, setNewTag] = useState('');

  const handleUpdateVisibility = async (value: 'public' | 'private') => {
    if (!accessSettings) return;
    try {
      await updateAccessSettings.mutateAsync({
        id: accessSettings.id,
        schedule_visibility: value,
      });
      toast.success('Schedule visibility updated');
    } catch (error) {
      toast.error('Failed to update visibility');
    }
  };

  const handleUpdateBookingPermission = async (value: 'everyone' | 'tagged_users') => {
    if (!accessSettings) return;
    try {
      await updateAccessSettings.mutateAsync({
        id: accessSettings.id,
        booking_permission: value,
      });
      toast.success('Booking permission updated');
    } catch (error) {
      toast.error('Failed to update permission');
    }
  };

  const handleAddBookingTag = async () => {
    if (!accessSettings || !newTag.trim()) return;
    try {
      await updateAccessSettings.mutateAsync({
        id: accessSettings.id,
        allowed_booking_tags: [...(accessSettings.allowed_booking_tags || []), newTag.trim()],
      });
      setNewTag('');
      toast.success('Tag added');
    } catch (error) {
      toast.error('Failed to add tag');
    }
  };

  const handleRemoveBookingTag = async (tagToRemove: string) => {
    if (!accessSettings) return;
    try {
      await updateAccessSettings.mutateAsync({
        id: accessSettings.id,
        allowed_booking_tags: (accessSettings.allowed_booking_tags || []).filter(t => t !== tagToRemove),
      });
      toast.success('Tag removed');
    } catch (error) {
      toast.error('Failed to remove tag');
    }
  };

  const handleAddUserRule = async () => {
    try {
      await createUserRule.mutateAsync({
        viewer_type: 'any_user',
        viewer_tags: [],
        display_order: (userRules?.length || 0) + 1,
        is_active: true,
      });
      toast.success('User visibility rule added');
    } catch (error) {
      toast.error('Failed to add rule');
    }
  };

  const handleDeleteUserRule = async (id: string) => {
    try {
      await deleteUserRule.mutateAsync(id);
      toast.success('User visibility rule deleted');
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  const handleAddBookingRule = async () => {
    try {
      await createBookingRule.mutateAsync({
        viewer_type: 'any_user',
        viewer_tags: [],
        space_filter: 'any_space',
        space_ids: [],
        holder_filter: 'any_or_no_user',
        holder_tags: [],
        booking_type_filter: 'any',
        display_order: (bookingRules?.length || 0) + 1,
        is_active: true,
      });
      toast.success('Booking visibility rule added');
    } catch (error) {
      toast.error('Failed to add rule');
    }
  };

  const handleDeleteBookingRule = async (id: string) => {
    try {
      await deleteBookingRule.mutateAsync(id);
      toast.success('Booking visibility rule deleted');
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  if (accessLoading || userRulesLoading || bookingRulesLoading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Access & Visibility</h2>
        <p className="text-sm text-muted-foreground">
          Control who can view and book on the schedule
        </p>
      </div>

      {/* Schedule Visibility */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Who Can View the Schedule?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={accessSettings?.schedule_visibility || 'public'}
            onValueChange={(value) => handleUpdateVisibility(value as 'public' | 'private')}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="public" id="public" />
              <Label htmlFor="public" className="cursor-pointer">
                <span className="font-medium">Public</span>
                <span className="text-muted-foreground ml-2">– Anyone can view the schedule</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="private" id="private" />
              <Label htmlFor="private" className="cursor-pointer">
                <span className="font-medium">Private</span>
                <span className="text-muted-foreground ml-2">– Only logged-in users can view</span>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Booking Permission */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Who Can Book?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={accessSettings?.booking_permission || 'everyone'}
            onValueChange={(value) => handleUpdateBookingPermission(value as 'everyone' | 'tagged_users')}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="everyone" id="everyone" />
              <Label htmlFor="everyone" className="cursor-pointer">
                <span className="font-medium">Everyone</span>
                <span className="text-muted-foreground ml-2">– Anyone can make bookings</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="tagged_users" id="tagged_users" />
              <Label htmlFor="tagged_users" className="cursor-pointer">
                <span className="font-medium">Only tagged users</span>
                <span className="text-muted-foreground ml-2">– Restrict bookings to specific user tags</span>
              </Label>
            </div>
          </RadioGroup>

          {accessSettings?.booking_permission === 'tagged_users' && (
            <div className="pl-6 space-y-3 border-l-2 ml-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter tag name"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddBookingTag()}
                  className="max-w-xs"
                />
                <Button onClick={handleAddBookingTag} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {accessSettings.allowed_booking_tags?.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => handleRemoveBookingTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Visibility Rules */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Visibility Rules
            </CardTitle>
            <Button size="sm" variant="outline" onClick={handleAddUserRule}>
              <Plus className="h-4 w-4 mr-1" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Configure which user information is visible to other users
          </p>
          {userRules && userRules.length > 0 ? (
            <div className="space-y-2">
              {userRules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-2">
                    <Badge variant={rule.viewer_type === 'any_user' ? 'default' : 'secondary'}>
                      {rule.viewer_type === 'any_user' ? 'Any User' : 'Tagged Users'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">can see user names</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteUserRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No user visibility rules configured. Default visibility applies.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Booking Visibility Rules */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Booking Visibility Rules
            </CardTitle>
            <Button size="sm" variant="outline" onClick={handleAddBookingRule}>
              <Plus className="h-4 w-4 mr-1" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Configure what booking information is visible based on viewer, space, holder, and booking type
          </p>
          {bookingRules && bookingRules.length > 0 ? (
            <div className="space-y-2">
              {bookingRules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {rule.viewer_type === 'any_user' ? 'Any User' : 'Tagged Users'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">viewing</span>
                    <Badge variant="outline">
                      {rule.space_filter === 'any_space' ? 'Any Space' : 'Specific Spaces'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">for</span>
                    <Badge variant="outline">
                      {rule.booking_type_filter === 'any' ? 'Any Type' : rule.booking_type_filter}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteBookingRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No booking visibility rules configured. Default visibility applies.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

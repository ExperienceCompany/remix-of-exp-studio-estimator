import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Upload, Save, ImageIcon, Loader2 } from 'lucide-react';
import { useAllStudios, useUpdateStudio, useCreateStudio, useUploadStudioImage, StudioAdmin } from '@/hooks/useStudiosAdmin';
import { toast } from 'sonner';

const STUDIO_TYPES = [
  { value: 'multimedia_studio', label: 'Multimedia Studio' },
  { value: 'audio_studio', label: 'Audio Studio' },
  { value: 'podcast_room', label: 'Podcast Room' },
  { value: 'digital_edit_studio', label: 'Digital Edit Studio' },
  { value: 'full_studio_buyout', label: 'Full Studio Buyout' },
] as const;

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

interface StudioCardProps {
  studio: StudioAdmin;
  onUpdate: (id: string, updates: Partial<StudioAdmin>) => void;
  onImageUpload: (studioId: string, file: File) => void;
  isUpdating: boolean;
  isUploading: boolean;
}

function StudioCard({ studio, onUpdate, onImageUpload, isUpdating, isUploading }: StudioCardProps) {
  const [edited, setEdited] = useState<Partial<StudioAdmin>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = <K extends keyof StudioAdmin>(field: K, value: StudioAdmin[K]) => {
    setEdited(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdate(studio.id, edited);
    setEdited({});
    setHasChanges(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(studio.id, file);
    }
  };

  const currentValue = <K extends keyof StudioAdmin>(field: K): StudioAdmin[K] => {
    return field in edited ? edited[field] as StudioAdmin[K] : studio[field];
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Thumbnail */}
          <div className="shrink-0">
            <div 
              className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : studio.thumbnail_url ? (
                <img 
                  src={studio.thumbnail_url} 
                  alt={studio.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full mt-1 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="h-3 w-3 mr-1" />
              Upload
            </Button>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <Input
                value={currentValue('name')}
                onChange={(e) => handleChange('name', e.target.value)}
                className="font-medium text-base"
                placeholder="Studio name"
              />
              <div className="flex items-center gap-2 shrink-0">
                <Label htmlFor={`active-${studio.id}`} className="text-sm text-muted-foreground">
                  Active
                </Label>
                <Switch
                  id={`active-${studio.id}`}
                  checked={currentValue('is_active') ?? true}
                  onCheckedChange={(checked) => handleChange('is_active', checked)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select
                  value={currentValue('type')}
                  onValueChange={(value) => handleChange('type', value as StudioAdmin['type'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STUDIO_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Calendar Color</Label>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 flex-wrap">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          currentValue('calendar_color') === color 
                            ? 'border-foreground scale-110' 
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => handleChange('calendar_color', color)}
                      />
                    ))}
                  </div>
                  <Input
                    type="color"
                    value={currentValue('calendar_color') || '#3b82f6'}
                    onChange={(e) => handleChange('calendar_color', e.target.value)}
                    className="w-8 h-6 p-0 border-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                value={currentValue('description') || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Studio description..."
                rows={2}
                className="resize-none"
              />
            </div>

            {hasChanges && (
              <div className="flex justify-end pt-2">
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StudiosEditor() {
  const { data: studios, isLoading } = useAllStudios();
  const updateStudio = useUpdateStudio();
  const createStudio = useCreateStudio();
  const uploadImage = useUploadStudioImage();
  const [uploadingStudioId, setUploadingStudioId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleUpdate = (id: string, updates: Partial<StudioAdmin>) => {
    updateStudio.mutate({ id, ...updates }, {
      onSuccess: () => toast.success('Studio updated'),
      onError: (err) => toast.error(`Failed to update: ${err.message}`),
    });
  };

  const handleImageUpload = async (studioId: string, file: File) => {
    setUploadingStudioId(studioId);
    try {
      const publicUrl = await uploadImage.mutateAsync({ file, studioId });
      await updateStudio.mutateAsync({ id: studioId, thumbnail_url: publicUrl });
      toast.success('Image uploaded');
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploadingStudioId(null);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    createStudio.mutate({
      name: 'New Studio',
      description: '',
      type: 'multimedia_studio',
      is_active: false,
      thumbnail_url: null,
      calendar_color: '#3b82f6',
    }, {
      onSuccess: () => {
        toast.success('Studio created');
        setIsCreating(false);
      },
      onError: (err) => {
        toast.error(`Failed to create: ${err.message}`);
        setIsCreating(false);
      },
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleCreate} disabled={isCreating}>
          {isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Add Studio
        </Button>
      </div>

      <div className="space-y-4">
        {studios?.map((studio) => (
          <StudioCard
            key={studio.id}
            studio={studio}
            onUpdate={handleUpdate}
            onImageUpload={handleImageUpload}
            isUpdating={updateStudio.isPending}
            isUploading={uploadingStudioId === studio.id}
          />
        ))}

        {studios?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No studios found. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}

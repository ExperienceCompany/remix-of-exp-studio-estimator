import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical, Plus, Pencil, Trash2, Type, AlignLeft, CheckSquare, List, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { CustomFieldModal } from './CustomFieldModal';
import {
  useCustomBookingFields,
  useCreateCustomField,
  useUpdateCustomField,
  useDeleteCustomField,
  useUpdateFieldConditions,
  useUpdateFieldOrder,
  CustomBookingField,
  CustomFieldCondition,
} from '@/hooks/useCustomBookingFields';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const FIELD_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  text: Type,
  multiline_text: AlignLeft,
  checkbox: CheckSquare,
  single_select: List,
  multi_select: ListChecks,
};

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Single-line text',
  multiline_text: 'Multi-line text',
  checkbox: 'Checkbox',
  single_select: 'Single-select',
  multi_select: 'Multi-select',
};

export function CustomFieldsEditor() {
  const { data: fields = [], isLoading } = useCustomBookingFields();
  const createField = useCreateCustomField();
  const updateField = useUpdateCustomField();
  const deleteField = useDeleteCustomField();
  const updateConditions = useUpdateFieldConditions();
  const updateOrder = useUpdateFieldOrder();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomBookingField | null>(null);
  const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleAddNew = () => {
    setEditingField(null);
    setModalOpen(true);
  };

  const handleEdit = (field: CustomBookingField) => {
    setEditingField(field);
    setModalOpen(true);
  };

  const handleSave = async (
    fieldData: Partial<CustomBookingField>,
    conditions: Omit<CustomFieldCondition, 'id' | 'created_at'>[]
  ) => {
    try {
      if (editingField) {
        await updateField.mutateAsync({ id: editingField.id, ...fieldData });
        await updateConditions.mutateAsync({
          fieldId: editingField.id,
          conditions: conditions.map(c => ({ ...c, field_id: editingField.id })),
        });
        toast.success('Custom field updated');
      } else {
        const newField = await createField.mutateAsync(fieldData as any);
        if (conditions.length > 0) {
          await updateConditions.mutateAsync({
            fieldId: newField.id,
            conditions: conditions.map(c => ({ ...c, field_id: newField.id })),
          });
        }
        toast.success('Custom field created');
      }
    } catch (error) {
      toast.error('Failed to save custom field');
    }
  };

  const handleDelete = async () => {
    if (!deleteFieldId) return;
    try {
      await deleteField.mutateAsync(deleteFieldId);
      toast.success('Custom field deleted');
      setDeleteFieldId(null);
    } catch (error) {
      toast.error('Failed to delete custom field');
    }
  };

  const handleToggleActive = async (field: CustomBookingField) => {
    try {
      await updateField.mutateAsync({ id: field.id, is_active: !field.is_active });
      toast.success(`Field ${field.is_active ? 'disabled' : 'enabled'}`);
    } catch (error) {
      toast.error('Failed to update field');
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newFields = [...fields];
    const [removed] = newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, removed);
    
    // Update the dragged index to the new position
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;
    
    const updates = fields.map((f, i) => ({
      id: f.id,
      display_order: i,
    }));
    
    try {
      await updateOrder.mutateAsync(updates);
    } catch (error) {
      toast.error('Failed to update order');
    }
    
    setDraggedIndex(null);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Custom Fields</CardTitle>
            <CardDescription>
              Flexibly collect additional booking information
            </CardDescription>
          </div>
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Field
          </Button>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No custom fields configured. Click "Add New Field" to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {fields.map((field, index) => {
                const Icon = FIELD_TYPE_ICONS[field.field_type] || Type;
                
                return (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 cursor-move transition-colors ${
                      draggedIndex === index ? 'opacity-50' : ''
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate max-w-[120px]">
                        {field.field_nickname}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {FIELD_TYPE_LABELS[field.field_type]}
                      </span>
                      <span className="text-sm text-muted-foreground truncate flex-1">
                        "{field.field_label}"
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(field)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteFieldId(field.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={field.is_active}
                        onCheckedChange={() => handleToggleActive(field)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CustomFieldModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        field={editingField}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteFieldId} onOpenChange={() => setDeleteFieldId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Field?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this custom field and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

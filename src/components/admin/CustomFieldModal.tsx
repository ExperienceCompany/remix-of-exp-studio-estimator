import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { HelpCircle, Type, AlignLeft, CheckSquare, List, ListChecks } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FieldInclusionConditions } from './FieldInclusionConditions';
import { CustomBookingField, CustomFieldCondition, useFieldConditions } from '@/hooks/useCustomBookingFields';

interface CustomFieldModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field?: CustomBookingField | null;
  onSave: (field: Partial<CustomBookingField>, conditions: Omit<CustomFieldCondition, 'id' | 'created_at'>[]) => void;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Single-line text', icon: Type },
  { value: 'multiline_text', label: 'Multi-line text', icon: AlignLeft },
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { value: 'single_select', label: 'Single-select dropdown', icon: List },
  { value: 'multi_select', label: 'Multi-select dropdown', icon: ListChecks },
];

interface ConditionState {
  id: string;
  condition_group: number;
  condition_field: string;
  condition_operator: string;
  condition_values: string[];
}

export function CustomFieldModal({ open, onOpenChange, field, onSave }: CustomFieldModalProps) {
  const isEditing = !!field;
  const { data: existingConditions = [] } = useFieldConditions(field?.id);

  const [formData, setFormData] = useState({
    field_type: 'text',
    field_label: '',
    field_nickname: '',
    field_placeholder: '',
    field_options: [] as string[],
    field_help_text: '',
    is_required: false,
    is_admin_only: false,
    min_selections: null as number | null,
    max_selections: null as number | null,
    display_order: 0,
    is_active: true,
  });

  const [conditions, setConditions] = useState<ConditionState[]>([]);
  const [optionsText, setOptionsText] = useState('');

  useEffect(() => {
    if (field) {
      setFormData({
        field_type: field.field_type,
        field_label: field.field_label,
        field_nickname: field.field_nickname,
        field_placeholder: field.field_placeholder || '',
        field_options: field.field_options || [],
        field_help_text: field.field_help_text || '',
        is_required: field.is_required,
        is_admin_only: field.is_admin_only,
        min_selections: field.min_selections,
        max_selections: field.max_selections,
        display_order: field.display_order,
        is_active: field.is_active,
      });
      setOptionsText((field.field_options || []).join('\n'));
      setConditions(existingConditions.map(c => ({
        id: c.id,
        condition_group: c.condition_group,
        condition_field: c.condition_field,
        condition_operator: c.condition_operator,
        condition_values: c.condition_values,
      })));
    } else {
      setFormData({
        field_type: 'text',
        field_label: '',
        field_nickname: '',
        field_placeholder: '',
        field_options: [],
        field_help_text: '',
        is_required: false,
        is_admin_only: false,
        min_selections: null,
        max_selections: null,
        display_order: 0,
        is_active: true,
      });
      setOptionsText('');
      setConditions([]);
    }
  }, [field, existingConditions]);

  const handleSave = () => {
    const options = optionsText.split('\n').map(o => o.trim()).filter(Boolean);
    
    onSave(
      {
        ...formData,
        field_options: options.length > 0 ? options : null,
        field_placeholder: formData.field_placeholder || null,
        field_help_text: formData.field_help_text || null,
      },
      conditions.map(c => ({
        field_id: field?.id || '',
        condition_group: c.condition_group,
        condition_field: c.condition_field,
        condition_operator: c.condition_operator,
        condition_values: c.condition_values,
      }))
    );
    onOpenChange(false);
  };

  const showOptionsField = ['single_select', 'multi_select'].includes(formData.field_type);
  const showSelectionsFields = formData.field_type === 'multi_select';

  const FieldTypeIcon = FIELD_TYPES.find(t => t.value === formData.field_type)?.icon || Type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FieldTypeIcon className="h-5 w-5" />
            {isEditing ? 'Edit Custom Field' : 'Add Custom Field'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Field Type */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Field type {isEditing && '(read only)'}</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                  <TooltipContent>The type of input field to display</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={formData.field_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, field_type: value }))}
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Field Label */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Field label *</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                  <TooltipContent>The label displayed above the field</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              value={formData.field_label}
              onChange={(e) => setFormData(prev => ({ ...prev, field_label: e.target.value }))}
              placeholder="e.g., Studio Usage Notes"
            />
          </div>

          {/* Field Options (for select types) */}
          {showOptionsField && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Field options *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>One option per line</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                rows={4}
              />
            </div>
          )}

          {/* Nickname and Placeholder */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Field nickname (max 10) *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Short name for compact display</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                value={formData.field_nickname}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  field_nickname: e.target.value.slice(0, 10) 
                }))}
                placeholder="Notes..."
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Field placeholder</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Placeholder text inside the field</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                value={formData.field_placeholder}
                onChange={(e) => setFormData(prev => ({ ...prev, field_placeholder: e.target.value }))}
                placeholder="Enter placeholder text..."
              />
            </div>
          </div>

          {/* Help Text */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Field help text</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                  <TooltipContent>Additional instructions shown below the field</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              value={formData.field_help_text}
              onChange={(e) => setFormData(prev => ({ ...prev, field_help_text: e.target.value }))}
              placeholder="Enter help text..."
              rows={2}
            />
          </div>

          {/* Min/Max Selections */}
          {showSelectionsFields && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Min allowed selections</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent>Minimum number of options required</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={formData.min_selections || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    min_selections: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Max allowed selections</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent>Maximum number of options allowed</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={formData.max_selections || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    max_selections: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  placeholder="Optional upper limit"
                />
              </div>
            </div>
          )}

          {/* Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_required"
                checked={formData.is_required}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_required: !!checked }))}
              />
              <Label htmlFor="is_required" className="cursor-pointer">
                The field is required
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_admin_only"
                checked={formData.is_admin_only}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_admin_only: !!checked }))}
              />
              <Label htmlFor="is_admin_only" className="cursor-pointer">
                After booking is created, values are admin-eyes only
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                  <TooltipContent>Hide submitted values from customers after booking</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <Separator />

          {/* Field Preview */}
          <div className="space-y-3">
            <div className="text-sm font-medium uppercase text-muted-foreground">Field Preview</div>
            <div className="border rounded-lg p-4 bg-muted/20">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">
                    {formData.field_label || 'Field Label'}
                  </span>
                  {formData.is_required && <span className="text-destructive">*</span>}
                  {formData.field_help_text && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><HelpCircle className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent>{formData.field_help_text}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                {formData.field_type === 'text' && (
                  <Input placeholder={formData.field_placeholder || 'Enter text...'} disabled />
                )}
                {formData.field_type === 'multiline_text' && (
                  <Textarea placeholder={formData.field_placeholder || 'Enter text...'} disabled rows={2} />
                )}
                {formData.field_type === 'checkbox' && (
                  <div className="flex items-center gap-2">
                    <Checkbox disabled />
                    <span className="text-sm text-muted-foreground">
                      {formData.field_label || 'Checkbox option'}
                    </span>
                  </div>
                )}
                {['single_select', 'multi_select'].includes(formData.field_type) && (
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder={formData.field_placeholder || 'Select...'} />
                    </SelectTrigger>
                  </Select>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Inclusion Conditions */}
          <div className="space-y-3">
            <div className="text-sm font-medium uppercase text-muted-foreground">Inclusion Conditions</div>
            <p className="text-sm text-muted-foreground">
              Control when this field appears on new bookings
            </p>
            <FieldInclusionConditions
              conditions={conditions}
              onChange={setConditions}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.field_label || !formData.field_nickname}
            >
              {isEditing ? 'Save changes' : 'Create field'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

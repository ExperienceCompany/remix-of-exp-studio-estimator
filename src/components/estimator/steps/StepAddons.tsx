import { useEffect } from 'react';
import { useEstimator } from '@/contexts/EstimatorContext';
import { useEditingMenu, useSessionAddons, useProviderLevels } from '@/hooks/useEstimatorData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Camera, Settings, Minus, Plus, Video, Users, AlertCircle, Check } from 'lucide-react';
import { VIDEO_EDITING_CONFIG } from './StepConfigure';
import { CrewAllocation } from '@/types/estimator';

export function StepAddons() {
  const { selection, updateSelection, setCurrentStep, totals } = useEstimator();
  const { data: editingMenu } = useEditingMenu();
  const { data: sessionAddons } = useSessionAddons();
  const { data: providerLevels } = useProviderLevels();

  // Filter session add-ons based on session type and studio
  const availableSessionAddons = sessionAddons?.filter(addon => {
    // Hide 'service' type add-ons (like Revisions) - these are for post-production, not sessions
    if (addon.addon_type === 'service') {
      return false;
    }
    
    // Hide Set Design addon - it's auto-included for photoshoots, not user-selectable
    if (addon.name.includes('Set Design')) {
      return false;
    }
    
    // Check session type restriction (e.g., 'diy' only)
    if (addon.applies_to_session_type && addon.applies_to_session_type !== selection.sessionType) {
      return false;
    }
    
    // Check studio types array restriction (new multi-studio logic)
    if (addon.applies_to_studio_types && addon.applies_to_studio_types.length > 0) {
      if (!selection.studioType || !addon.applies_to_studio_types.includes(selection.studioType)) {
        return false;
      }
    } else if (addon.applies_to_studio_type && addon.applies_to_studio_type !== selection.studioType) {
      // Legacy single-value fallback
      return false;
    }
    
    return true;
  }) || [];

  // Filter for photo editing only
  const photoEditingItems = editingMenu?.filter(item => item.category === 'photo_editing') || [];

  // Filter for video editing (non-photo categories) and sort so long-form is at bottom
  const videoEditingItems = editingMenu?.filter(item => 
    item.category !== 'photo_editing'
  ).sort((a, b) => {
    const aIsLongForm = a.category.startsWith('long_form');
    const bIsLongForm = b.category.startsWith('long_form');
    if (aIsLongForm && !bIsLongForm) return 1;
    if (!aIsLongForm && bIsLongForm) return -1;
    return 0;
  }) || [];

  // Show photo editing only for photoshoot
  const showPhotoEditing = selection.serviceType === 'photoshoot';

  // Show video editing for vodcast (both DIY and Serviced)
  const showVideoEditing = selection.serviceType === 'vodcast';

  // Note: Auto-add editing items now happens in StepService when user says "yes" to editing
  // This ensures the running total is correct on the Day & Time screen

  // Calculate assigned crew across all editing items
  const getAssignedCrew = (): CrewAllocation => {
    return selection.editingItems.reduce(
      (acc, item) => ({
        lv1: acc.lv1 + (item.assignedCrew?.lv1 || 0),
        lv2: acc.lv2 + (item.assignedCrew?.lv2 || 0),
        lv3: acc.lv3 + (item.assignedCrew?.lv3 || 0),
      }),
      { lv1: 0, lv2: 0, lv3: 0 }
    );
  };

  // Helper to get total crew assigned to a specific editing item
  const getTotalCrewForItem = (item: { assignedCrew?: CrewAllocation }) => 
    (item.assignedCrew?.lv1 || 0) + 
    (item.assignedCrew?.lv2 || 0) + 
    (item.assignedCrew?.lv3 || 0);

  // Check if crew assignment is required and complete
  // For post-production: each enabled video editing add-on must have at least 1 crew member
  const videoEditingItems_selected = selection.editingItems.filter(e => e.category !== 'photo_editing');
  const hasVideoEditingSelected = videoEditingItems_selected.length > 0;
  const allVideoEditingHaveCrew = videoEditingItems_selected.every(e => getTotalCrewForItem(e) >= 1);
  const canProceed = !hasVideoEditingSelected || allVideoEditingHaveCrew;

  const toggleEditingItem = (item: any, defaultDuration?: number) => {
    const existing = selection.editingItems.find(e => e.id === item.id);
    if (existing) {
      updateSelection({
        editingItems: selection.editingItems.filter(e => e.id !== item.id),
      });
    } else {
      // For Enhance Edit, enforce 10 edit minimum
      const isEnhance = item.name === 'Enhance Edit';
      const config = VIDEO_EDITING_CONFIG[item.category];
      
      // For vodcast/audio_podcast, start video editing at session duration
      let defaultQuantity = isEnhance ? 10 : (defaultDuration || config?.baseDuration || 1);
      
      // Only long form editing uses session duration as starting point
      if (
        (selection.serviceType === 'vodcast' || selection.serviceType === 'audio_podcast') &&
        config &&
        (item.category === 'long_form_simple' || item.category === 'long_form_advanced')
      ) {
        const sessionDurationSeconds = selection.hours * 3600;
        defaultQuantity = Math.max(defaultQuantity, sessionDurationSeconds);
      }
      
      updateSelection({
        editingItems: [
          ...selection.editingItems,
          {
            id: item.id,
            name: item.name,
            category: item.category,
            quantity: defaultQuantity,
            basePrice: Number(item.base_price),
            customerPrice: Number(item.customer_price || item.base_price * 2),
            incrementPrice: item.increment_price ? Number(item.increment_price) : null,
            assignedCrew: { lv1: 0, lv2: 0, lv3: 0 },  // Start with no crew assigned
          },
        ],
      });
    }
  };

  const updateEditingQuantity = (itemId: string, newQuantity: number, category?: string) => {
    updateSelection({
      editingItems: selection.editingItems.map(e => {
        if (e.id !== itemId) return e;
        
        // Enforce minimums based on type
        const isEnhance = e.name === 'Enhance Edit';
        const config = category ? VIDEO_EDITING_CONFIG[category] : null;
        const minQuantity = isEnhance ? 10 : (config?.minDuration || 1);
        const quantity = Math.max(minQuantity, newQuantity);
        
        return { ...e, quantity };
      }),
    });
  };

  const updateEditingAssignedCrew = (itemId: string, level: keyof CrewAllocation, delta: number) => {
    updateSelection({
      editingItems: selection.editingItems.map(e => {
        if (e.id !== itemId) return e;
        const current = e.assignedCrew?.[level] || 0;
        const newValue = current + delta;
        
        // Don't allow negative values
        if (newValue < 0) return e;
        
        return {
          ...e,
          assignedCrew: {
            ...e.assignedCrew || { lv1: 0, lv2: 0, lv3: 0 },
            [level]: newValue,
          },
        };
      }),
    });
  };

  const toggleSessionAddon = (addon: any) => {
    const existing = selection.sessionAddons.find(a => a.id === addon.id);
    // Don't allow toggling auto-included addons
    if (existing?.isAutoIncluded) return;
    
    if (existing) {
      updateSelection({
        sessionAddons: selection.sessionAddons.filter(a => a.id !== addon.id),
      });
    } else {
      const isRevisions = addon.name === 'Revisions';
      updateSelection({
        sessionAddons: [
          ...selection.sessionAddons,
          {
            id: addon.id,
            name: addon.name,
            flatAmount: Number(addon.flat_amount),
            isHourly: addon.is_hourly ?? false,
            hours: isRevisions ? 1 : undefined,  // Start revisions at 1 hour
          },
        ],
      });
    }
  };

  // Note: Auto-included addons are shown on the TimeSlot step, not here

  const updateRevisionHours = (addonId: string, newHours: number) => {
    updateSelection({
      sessionAddons: selection.sessionAddons.map(a => 
        a.id === addonId ? { ...a, hours: Math.max(1, newHours) } : a
      ),
    });
  };

  const handleNext = () => {
    // Check if there are video editing items that need configuration
    const hasVideoEditingToConfig = selection.editingItems.some(item => {
      const menuItem = editingMenu?.find(m => m.id === item.id);
      return menuItem && menuItem.category !== 'photo_editing';
    });
    
    const isDiy = selection.sessionType === 'diy';
    
    if (hasVideoEditingToConfig) {
      // DIY: Addons is step 4 → Configure is step 5
      // Serviced: Addons is step 5 → Configure is step 6
      setCurrentStep(isDiy ? 5 : 6);
    } else {
      // DIY: Addons is step 4 → Summary is step 6
      // Serviced: Addons is step 5 → Summary is step 7
      setCurrentStep(isDiy ? 6 : 7);
    }
  };

  const renderPhotoEditingWithQuantity = () => {
    if (!showPhotoEditing || photoEditingItems.length === 0) return null;
    
    // Get included edits from package
    const includedEdits = selection.packagePricing?.includedEdits || 0;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4" />
            Photo Editing
          </CardTitle>
          <CardDescription>
            {selection.wantsEditing ? (
              <>
                <span className="text-green-600 dark:text-green-400">You selected to include editing.</span>
                {' '}Adjust quantities below.
              </>
            ) : includedEdits > 0 
              ? `${includedEdits} enhance edits included with package. Add more below.`
              : 'Select editing services and quantity'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {photoEditingItems.map(item => {
            const selectedItem = selection.editingItems.find(e => e.id === item.id);
            const isSelected = !!selectedItem;
            const quantity = selectedItem?.quantity || 0;
            const customerPrice = Number(item.customer_price || item.base_price * 2);
            const isEnhance = item.name === 'Enhance Edit';
            const itemTotal = quantity * customerPrice;
            
            return (
              <div 
                key={item.id} 
                className="space-y-2 py-3 border-b last:border-0"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={isSelected}
                      onCheckedChange={() => toggleEditingItem(item)}
                    />
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                      {isEnhance && (
                        <p className="text-xs text-primary font-medium">10 edit minimum ($100)</p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-medium">
                    ${customerPrice}/edit
                  </span>
                </div>
                
                {isSelected && (
                  <div className="flex items-center justify-between pl-12">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateEditingQuantity(item.id, quantity - 1)}
                        disabled={isEnhance ? quantity <= 10 : quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => updateEditingQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-16 h-8 text-center"
                        min={isEnhance ? 10 : 1}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateEditingQuantity(item.id, quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-bold">
                      +${itemTotal}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  const renderVideoEditingOptions = () => {
    if (!showVideoEditing || videoEditingItems.length === 0) return null;

    const lv1Rate = providerLevels?.find(p => p.level === 'lv1')?.hourly_rate || 20;
    const lv2Rate = providerLevels?.find(p => p.level === 'lv2')?.hourly_rate || 30;
    const lv3Rate = providerLevels?.find(p => p.level === 'lv3')?.hourly_rate || 40;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Video className="h-4 w-4" />
            Video Editing (Optional)
          </CardTitle>
          <CardDescription>
            Add post-production editing to your vodcast recording
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {videoEditingItems.map(item => {
            const selectedItem = selection.editingItems.find(e => e.id === item.id);
            const isSelected = !!selectedItem;
            const customerPrice = Number(item.customer_price);
            const itemAssignedCrew = selectedItem?.assignedCrew || { lv1: 0, lv2: 0, lv3: 0 };
            const itemTotalCrew = getTotalCrewForItem(selectedItem || { assignedCrew: { lv1: 0, lv2: 0, lv3: 0 } });
            const isLongForm = item.category.startsWith('long_form');
            const needsCrew = isSelected && itemTotalCrew < 1;
            
            return (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={isSelected}
                      onCheckedChange={() => toggleEditingItem(item, VIDEO_EDITING_CONFIG[item.category]?.baseDuration)}
                    />
                    <div>
                      <p className="text-sm font-medium flex items-center gap-2">
                        {item.name}
                        {isLongForm && (
                          <Badge className="bg-amber-400 text-amber-900 border-amber-500 hover:bg-amber-400">
                            Recommended
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium">
                    from ${customerPrice}
                  </span>
                </div>
                
                {/* Crew assignment - always show all 3 levels when selected */}
                {isSelected && (
                  <div className="pl-12 pb-2 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Assign Production Crew:</span>
                      {needsCrew && (
                        <span className="text-xs text-destructive">(min 1 required)</span>
                      )}
                    </div>
                    
                    {/* Lv1 - always show */}
                    <div className="flex items-center justify-between pl-6">
                      <span className="text-xs text-muted-foreground">Lv1 Entry</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateEditingAssignedCrew(item.id, 'lv1', -1)}
                          disabled={itemAssignedCrew.lv1 <= 0}
                        >
                          <Minus className="h-2 w-2" />
                        </Button>
                        <span className="w-5 text-center text-xs font-medium">{itemAssignedCrew.lv1}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateEditingAssignedCrew(item.id, 'lv1', 1)}
                        >
                          <Plus className="h-2 w-2" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Lv2 - always show */}
                    <div className="flex items-center justify-between pl-6">
                      <span className="text-xs text-muted-foreground">Lv2 Experienced</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateEditingAssignedCrew(item.id, 'lv2', -1)}
                          disabled={itemAssignedCrew.lv2 <= 0}
                        >
                          <Minus className="h-2 w-2" />
                        </Button>
                        <span className="w-5 text-center text-xs font-medium">{itemAssignedCrew.lv2}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateEditingAssignedCrew(item.id, 'lv2', 1)}
                        >
                          <Plus className="h-2 w-2" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Lv3 - always show */}
                    <div className="flex items-center justify-between pl-6">
                      <span className="text-xs text-muted-foreground">Lv3 Expert</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateEditingAssignedCrew(item.id, 'lv3', -1)}
                          disabled={itemAssignedCrew.lv3 <= 0}
                        >
                          <Minus className="h-2 w-2" />
                        </Button>
                        <span className="w-5 text-center text-xs font-medium">{itemAssignedCrew.lv3}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateEditingAssignedCrew(item.id, 'lv3', 1)}
                        >
                          <Plus className="h-2 w-2" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Total crew for this item */}
                    <div className="flex items-center justify-between pl-6 pt-1">
                      <span className="text-xs font-medium">Total Crew:</span>
                      <span className={`text-xs font-medium ${needsCrew ? 'text-destructive' : 'text-primary'}`}>
                        {itemTotalCrew} {itemTotalCrew >= 1 && <Check className="inline h-3 w-3" />}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };


  return (
    <div className="space-y-6">
      {/* Note: Auto-included add-ons are shown on the TimeSlot step */}
      {/* Session Add-ons */}
      {availableSessionAddons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4" />
              Session Add-ons
            </CardTitle>
            <CardDescription>
              Optional equipment and setup services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableSessionAddons.map(addon => {
              const selectedAddon = selection.sessionAddons.find(a => a.id === addon.id);
              const isSelected = !!selectedAddon;
              const isHourly = addon.is_hourly;
              const isRevisions = addon.name === 'Revisions';
              const revisionHours = selectedAddon?.hours || 1;
              
              const displayPrice = isRevisions
                ? `+$${Number(addon.flat_amount)}/hr`
                : isHourly 
                  ? `+$${Number(addon.flat_amount)}/hr` 
                  : `+$${Number(addon.flat_amount)}`;
                  
              return (
                <div key={addon.id} className="space-y-2">
                  <div className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={isSelected}
                        onCheckedChange={() => toggleSessionAddon(addon)}
                      />
                      <div>
                        <p className="text-sm font-medium">{addon.name}</p>
                        <p className="text-xs text-muted-foreground">{addon.description}</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium">
                      {displayPrice}
                    </span>
                  </div>
                  
                  {/* Revisions hour selector */}
                  {isSelected && isRevisions && (
                    <div className="flex items-center justify-between pl-12 pb-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateRevisionHours(addon.id, revisionHours - 1)}
                          disabled={revisionHours <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          value={revisionHours}
                          onChange={(e) => updateRevisionHours(addon.id, parseInt(e.target.value) || 1)}
                          className="w-16 h-8 text-center"
                          min={1}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateRevisionHours(addon.id, revisionHours + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs text-muted-foreground">hours</span>
                      </div>
                      <span className="text-sm font-bold">
                        = ${revisionHours * Number(addon.flat_amount)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Photo Editing Services (only for photoshoot) */}
      {renderPhotoEditingWithQuantity()}

      {/* Video Editing Services (only for vodcast) */}
      {renderVideoEditingOptions()}

      {/* Running Total */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Running Total</span>
            <span className="text-xl font-bold">${totals.customerTotal.toFixed(0)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Crew Assignment Warning */}
      {hasVideoEditingSelected && !allVideoEditingHaveCrew && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Please assign at least 1 production crew member to each editing service.</span>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => {
          // DIY: Addons is step 4 → Duration is step 3
          // Serviced: Addons is step 5 → Duration is step 4
          setCurrentStep(selection.sessionType === 'diy' ? 3 : 4);
        }}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleNext} disabled={!canProceed}>
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

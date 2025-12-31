import { useEstimator } from '@/contexts/EstimatorContext';
import { useEditingMenu, useSessionAddons, useProviderLevels } from '@/hooks/useEstimatorData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Camera, Minus, Plus, Video, Users, AlertCircle, Settings } from 'lucide-react';
import { VIDEO_EDITING_CONFIG } from './StepConfigure';
import { ProviderLevel } from '@/types/estimator';

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

  // Filter for photo editing only and sort in display order
  const PHOTO_EDITING_ORDER = ['Simple Retouch Edit', 'Advanced Edit', 'Special Effects Edit'];
  const photoEditingItems = editingMenu?.filter(item => item.category === 'photo_editing')
    .sort((a, b) => PHOTO_EDITING_ORDER.indexOf(a.name) - PHOTO_EDITING_ORDER.indexOf(b.name)) || [];

  // Determine minimum for Simple Retouch Edit based on flow
  // Package flow: 10 edits minimum, Regular photoshoot: 5 edits minimum
  const isPackage = selection.packagePricing !== null;
  const simpleRetouchMinimum = isPackage ? 10 : 5;

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

  // Crew level multipliers for post-production services
  const EDITING_CREW_MULTIPLIERS = { lv1: 0.75, lv2: 1, lv3: 1.25 };

  // Check if crew level is required and complete
  // For post-production: each enabled video editing add-on must have a crew level
  const videoEditingItems_selected = selection.editingItems.filter(e => e.category !== 'photo_editing');
  const hasVideoEditingSelected = videoEditingItems_selected.length > 0;
  const allVideoEditingHaveLevel = videoEditingItems_selected.every(e => e.crewLevel);
  const canProceed = !hasVideoEditingSelected || allVideoEditingHaveLevel;

  const toggleEditingItem = (item: any, defaultDuration?: number) => {
    const existing = selection.editingItems.find(e => e.id === item.id);
    if (existing) {
      updateSelection({
        editingItems: selection.editingItems.filter(e => e.id !== item.id),
      });
    } else {
      // For Simple Retouch Edit, enforce minimum based on service type
      const isSimpleRetouch = item.name === 'Simple Retouch Edit';
      const config = VIDEO_EDITING_CONFIG[item.category];
      
      // For vodcast/audio_podcast, start video editing at session duration
      let defaultQuantity = isSimpleRetouch ? simpleRetouchMinimum : (defaultDuration || config?.baseDuration || 1);
      
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
            crewLevel: 'lv2',  // Default to Lv2 (1x multiplier)
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
        const isSimpleRetouch = e.name === 'Simple Retouch Edit';
        const config = category ? VIDEO_EDITING_CONFIG[category] : null;
        const minQuantity = isSimpleRetouch ? simpleRetouchMinimum : (config?.minDuration || 1);
        const quantity = Math.max(minQuantity, newQuantity);
        
        return { ...e, quantity };
      }),
    });
  };

  const setEditingCrewLevel = (itemId: string, level: 'lv1' | 'lv2' | 'lv3') => {
    updateSelection({
      editingItems: selection.editingItems.map(e => {
        if (e.id !== itemId) return e;
        return { ...e, crewLevel: level };
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
            const isSimpleRetouch = item.name === 'Simple Retouch Edit';
            const itemTotal = quantity * customerPrice;
            const minCost = simpleRetouchMinimum * customerPrice;
            
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
                      {isSimpleRetouch && (
                        <p className="text-xs text-primary font-medium">{simpleRetouchMinimum} edit minimum (${minCost})</p>
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
                        disabled={isSimpleRetouch ? quantity <= simpleRetouchMinimum : quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => updateEditingQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-16 h-8 text-center"
                        min={isSimpleRetouch ? simpleRetouchMinimum : 1}
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
            const crewLevel = selectedItem?.crewLevel || 'lv2';
            const multiplier = EDITING_CREW_MULTIPLIERS[crewLevel];
            const isLongForm = item.category.startsWith('long_form');
            
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
                
                {/* Crew level selection - radio buttons with multipliers */}
                {isSelected && (
                  <div className="pl-12 pb-2 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Editor Level:</span>
                    </div>
                    
                    <div className="flex flex-col gap-2 pl-6">
                      {/* Lv1 Entry - 0.75x */}
                      <label className={`flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors ${crewLevel === 'lv1' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name={`crew-level-${item.id}`}
                            checked={crewLevel === 'lv1'}
                            onChange={() => setEditingCrewLevel(item.id, 'lv1')}
                            className="h-4 w-4 text-primary"
                          />
                          <span className="text-sm font-medium">Lv1 Entry</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">0.75x</Badge>
                      </label>
                      
                      {/* Lv2 Experienced - 1x (Standard) */}
                      <label className={`flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors ${crewLevel === 'lv2' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name={`crew-level-${item.id}`}
                            checked={crewLevel === 'lv2'}
                            onChange={() => setEditingCrewLevel(item.id, 'lv2')}
                            className="h-4 w-4 text-primary"
                          />
                          <span className="text-sm font-medium">Lv2 Experienced</span>
                          <Badge variant="outline" className="text-xs text-primary border-primary">Standard</Badge>
                        </div>
                        <Badge variant="secondary" className="text-xs">1x</Badge>
                      </label>
                      
                      {/* Lv3 Expert - 1.25x */}
                      <label className={`flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors ${crewLevel === 'lv3' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name={`crew-level-${item.id}`}
                            checked={crewLevel === 'lv3'}
                            onChange={() => setEditingCrewLevel(item.id, 'lv3')}
                            className="h-4 w-4 text-primary"
                          />
                          <span className="text-sm font-medium">Lv3 Expert</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">1.25x</Badge>
                      </label>
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

      {/* Crew Level Selection Info */}
      {hasVideoEditingSelected && !allVideoEditingHaveLevel && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Please select an editor level for each video editing service.</span>
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

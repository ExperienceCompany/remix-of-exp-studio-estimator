import { useEstimator } from '@/contexts/EstimatorContext';
import { useEditingMenu, useSessionAddons } from '@/hooks/useEstimatorData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Film, Camera, Settings, Minus, Plus } from 'lucide-react';

export function StepAddons() {
  const { selection, updateSelection, setCurrentStep, totals } = useEstimator();
  const { data: editingMenu } = useEditingMenu();
  const { data: sessionAddons } = useSessionAddons();

  // Filter session add-ons based on session type and studio
  const availableSessionAddons = sessionAddons?.filter(addon => {
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

  // Group editing menu by category
  const photoEditingItems = editingMenu?.filter(item => item.category === 'photo_editing') || [];
  const videoEditingItems = editingMenu?.filter(item => item.category !== 'photo_editing') || [];

  // Show photo editing only for photoshoot package
  const showPhotoEditing = selection.serviceType === 'photoshoot';

  const toggleEditingItem = (item: any) => {
    const existing = selection.editingItems.find(e => e.id === item.id);
    if (existing) {
      updateSelection({
        editingItems: selection.editingItems.filter(e => e.id !== item.id),
      });
    } else {
      // For Enhance Edit, enforce 10 edit minimum
      const isEnhance = item.name === 'Enhance Edit';
      const defaultQuantity = isEnhance ? 10 : 1;
      
      updateSelection({
        editingItems: [
          ...selection.editingItems,
          {
            id: item.id,
            name: item.name,
            quantity: defaultQuantity,
            basePrice: Number(item.base_price),
            customerPrice: Number(item.customer_price || item.base_price * 2),
            incrementPrice: item.increment_price ? Number(item.increment_price) : null,
          },
        ],
      });
    }
  };

  const updateEditingQuantity = (itemId: string, newQuantity: number) => {
    updateSelection({
      editingItems: selection.editingItems.map(e => {
        if (e.id !== itemId) return e;
        
        // Enforce 10 minimum for Enhance Edit
        const isEnhance = e.name === 'Enhance Edit';
        const minQuantity = isEnhance ? 10 : 1;
        const quantity = Math.max(minQuantity, newQuantity);
        
        return { ...e, quantity };
      }),
    });
  };

  const toggleSessionAddon = (addon: any) => {
    const existing = selection.sessionAddons.find(a => a.id === addon.id);
    if (existing) {
      updateSelection({
        sessionAddons: selection.sessionAddons.filter(a => a.id !== addon.id),
      });
    } else {
      updateSelection({
        sessionAddons: [
          ...selection.sessionAddons,
          {
            id: addon.id,
            name: addon.name,
            flatAmount: Number(addon.flat_amount),
            isHourly: addon.is_hourly ?? false,
          },
        ],
      });
    }
  };

  const handleNext = () => {
    setCurrentStep(6);
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
            {includedEdits > 0 
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
                      = ${itemTotal}
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

  const renderVideoEditingItems = () => {
    if (videoEditingItems.length === 0) return null;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Film className="h-4 w-4" />
            Video Editing Services
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {videoEditingItems.map(item => {
            const isSelected = selection.editingItems.some(e => e.id === item.id);
            const customerPrice = Number(item.customer_price || item.base_price * 2);
            return (
              <div 
                key={item.id} 
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={isSelected}
                    onCheckedChange={() => toggleEditingItem(item)}
                  />
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <span className="text-sm font-medium">
                  ${customerPrice}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
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
              const isSelected = selection.sessionAddons.some(a => a.id === addon.id);
              const isHourly = addon.is_hourly;
              const displayPrice = isHourly 
                ? `+$${Number(addon.flat_amount)}/hr` 
                : `+$${Number(addon.flat_amount)}`;
              return (
                <div 
                  key={addon.id} 
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
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
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Photo Editing Services (only for photoshoot) */}
      {renderPhotoEditingWithQuantity()}

      {/* Video Editing Services */}
      {renderVideoEditingItems()}

      {/* Running Total */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Running Total</span>
            <span className="text-xl font-bold">${totals.customerTotal.toFixed(0)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(4)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleNext}>
          View Summary
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

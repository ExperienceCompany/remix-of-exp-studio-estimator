import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, AlertCircle, Save, RefreshCw, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDiyRates, useProviderLevels, useStudios, useTimeSlots } from '@/hooks/useEstimatorData';
import { useOpsSettings } from '@/hooks/useOpsSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

function RatesEditor() {
  const { data: rates, isLoading } = useDiyRates();
  const { data: studios } = useStudios();
  const { data: timeSlots } = useTimeSlots();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editedRates, setEditedRates] = useState<Record<string, { first: string; after: string }>>({});

  const getStudioName = (studioId: string) => {
    return studios?.find(s => s.id === studioId)?.name || studioId;
  };

  const getTimeSlotName = (slotId: string) => {
    return timeSlots?.find(t => t.id === slotId)?.display_name || slotId;
  };

  const handleRateChange = (rateId: string, field: 'first' | 'after', value: string) => {
    setEditedRates(prev => ({
      ...prev,
      [rateId]: {
        ...prev[rateId],
        [field]: value,
      },
    }));
  };

  const handleSaveRate = async (rateId: string) => {
    const edited = editedRates[rateId];
    if (!edited) return;

    const { error } = await supabase
      .from('diy_rates')
      .update({
        first_hour_rate: parseFloat(edited.first) || 0,
        after_first_hour_rate: edited.after ? parseFloat(edited.after) : null,
      })
      .eq('id', rateId);

    if (error) {
      toast({ title: 'Error saving rate', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Rate updated!' });
      queryClient.invalidateQueries({ queryKey: ['diy_rates'] });
      setEditedRates(prev => {
        const next = { ...prev };
        delete next[rateId];
        return next;
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading rates...</div>;
  }

  // Group rates by studio
  const groupedRates = rates?.reduce((acc, rate) => {
    const studioId = rate.studio_id;
    if (!acc[studioId]) acc[studioId] = [];
    acc[studioId].push(rate);
    return acc;
  }, {} as Record<string, typeof rates>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedRates || {}).map(([studioId, studioRates]) => (
        <Card key={studioId}>
          <CardHeader>
            <CardTitle className="text-lg">{getStudioName(studioId)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time Slot</TableHead>
                  <TableHead>First Hour ($)</TableHead>
                  <TableHead>After First Hour ($)</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studioRates?.map(rate => {
                  const edited = editedRates[rate.id];
                  const hasChanges = !!edited;

                  return (
                    <TableRow key={rate.id}>
                      <TableCell>{getTimeSlotName(rate.time_slot_id)}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={edited?.first ?? rate.first_hour_rate}
                          onChange={(e) => handleRateChange(rate.id, 'first', e.target.value)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={edited?.after ?? (rate.after_first_hour_rate || '')}
                          onChange={(e) => handleRateChange(rate.id, 'after', e.target.value)}
                          placeholder="—"
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        {hasChanges && (
                          <Button size="sm" onClick={() => handleSaveRate(rate.id)}>
                            <Save className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProvidersEditor() {
  const { data: providers, isLoading } = useProviderLevels();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editedProviders, setEditedProviders] = useState<Record<string, string>>({});

  const handleChange = (id: string, value: string) => {
    setEditedProviders(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async (id: string) => {
    const value = editedProviders[id];
    if (!value) return;

    const { error } = await supabase
      .from('provider_levels')
      .update({ hourly_rate: parseFloat(value) })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Provider rate updated!' });
      queryClient.invalidateQueries({ queryKey: ['provider_levels'] });
      setEditedProviders(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider Levels</CardTitle>
        <CardDescription>Set hourly rates for each production crew level</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Level</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Hourly Rate ($)</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers?.map(p => {
              const edited = editedProviders[p.id];
              const hasChanges = edited !== undefined;

              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.level.toUpperCase()}</TableCell>
                  <TableCell>{p.display_name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={edited ?? p.hourly_rate}
                      onChange={(e) => handleChange(p.id, e.target.value)}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    {hasChanges && (
                      <Button size="sm" onClick={() => handleSave(p.id)}>
                        <Save className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function OpsSettingsEditor() {
  const { settings, totalMonthlyExpenses, hourlyOverheadRate, isLoading, updateAllSettings, isUpdating } = useOpsSettings();
  const { toast } = useToast();
  const [editedSettings, setEditedSettings] = useState({
    monthly_rent: '',
    monthly_utilities: '',
    monthly_insurance: '',
    monthly_other: '',
    operating_hours_per_month: '',
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings && !hasChanges) {
      setEditedSettings({
        monthly_rent: settings.monthly_rent.toString(),
        monthly_utilities: settings.monthly_utilities.toString(),
        monthly_insurance: settings.monthly_insurance.toString(),
        monthly_other: settings.monthly_other.toString(),
        operating_hours_per_month: settings.operating_hours_per_month.toString(),
      });
    }
  }, [settings, hasChanges]);

  const handleChange = (key: string, value: string) => {
    setEditedSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    try {
      await updateAllSettings({
        monthly_rent: parseFloat(editedSettings.monthly_rent) || 0,
        monthly_utilities: parseFloat(editedSettings.monthly_utilities) || 0,
        monthly_insurance: parseFloat(editedSettings.monthly_insurance) || 0,
        monthly_other: parseFloat(editedSettings.monthly_other) || 0,
        operating_hours_per_month: parseFloat(editedSettings.operating_hours_per_month) || 240,
      });
      toast({ title: 'Settings saved!' });
      setHasChanges(false);
    } catch (error) {
      toast({ title: 'Error saving settings', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading settings...</div>;
  }

  const settingsFields = [
    { key: 'monthly_rent', label: 'Monthly Rent', prefix: '$' },
    { key: 'monthly_utilities', label: 'Monthly Utilities', prefix: '$' },
    { key: 'monthly_insurance', label: 'Monthly Insurance', prefix: '$' },
    { key: 'monthly_other', label: 'Monthly Other Expenses', prefix: '$' },
    { key: 'operating_hours_per_month', label: 'Operating Hours/Month', prefix: '' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Operating Expenses
          </CardTitle>
          <CardDescription>
            Set monthly expenses to calculate overhead rate for net profit analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {settingsFields.map(({ key, label, prefix }) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{label}</Label>
                <div className="relative">
                  {prefix && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {prefix}
                    </span>
                  )}
                  <Input
                    id={key}
                    type="number"
                    value={editedSettings[key as keyof typeof editedSettings]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className={prefix ? 'pl-7' : ''}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Monthly Expenses:</span>
              <span className="font-semibold">${totalMonthlyExpenses.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Hourly Overhead Rate:</span>
              <span className="font-semibold">${hourlyOverheadRate.toFixed(2)}/hr</span>
            </div>
          </div>

          <Button 
            onClick={handleSaveAll} 
            disabled={!hasChanges || isUpdating}
            className="w-full mt-4"
          >
            <Save className="h-4 w-4 mr-2" />
            {isUpdating ? 'Saving...' : 'Save All Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Admin() {
  const { isAdmin, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You need admin privileges to access this page.
            </p>
            <Button asChild>
              <Link to="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
          <span className="font-semibold">Admin Panel</span>
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <section className="container py-6">
        <Tabs defaultValue="rates">
          <TabsList className="mb-6">
            <TabsTrigger value="rates">DIY Rates</TabsTrigger>
            <TabsTrigger value="providers">Provider Levels</TabsTrigger>
            <TabsTrigger value="ops">Ops Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="rates">
            <RatesEditor />
          </TabsContent>

          <TabsContent value="providers">
            <ProvidersEditor />
          </TabsContent>

          <TabsContent value="ops">
            <OpsSettingsEditor />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

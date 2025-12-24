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
import { ArrowLeft, AlertCircle, Save, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDiyRates, useProviderLevels, useStudios, useTimeSlots } from '@/hooks/useEstimatorData';
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
          </TabsList>

          <TabsContent value="rates">
            <RatesEditor />
          </TabsContent>

          <TabsContent value="providers">
            <ProvidersEditor />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

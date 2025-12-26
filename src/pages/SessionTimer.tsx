import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Play, Pause, Square, Timer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SessionBreakdown } from '@/components/session/SessionBreakdown';
import { LiveCostDisplay } from '@/components/session/LiveCostDisplay';
import { SessionEndScreen } from '@/components/session/SessionEndScreen';
import type { EstimatorSelection } from '@/types/estimator';

type SessionStatus = 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';

interface Session {
  id: string;
  quote_id: string | null;
  status: SessionStatus;
  started_at: string | null;
  paused_at: string | null;
  ended_at: string | null;
  total_paused_seconds: number;
  actual_duration_seconds: number | null;
  session_type: string;
  selections_json: EstimatorSelection | null;
  original_total: number | null;
  final_total: number | null;
  payment_status: string;
  affiliate_code: string | null;
}

export default function SessionTimer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);

  // Fetch session data
  const { data: session, isLoading, error } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return {
        ...data,
        selections_json: data.selections_json as unknown as EstimatorSelection | null,
      } as Session;
    },
    enabled: !!id,
  });

  // Update session mutation
  const updateSession = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] });
    },
    onError: (error) => {
      toast({ title: 'Failed to update session', variant: 'destructive' });
      console.error('Session update error:', error);
    },
  });

  // Timer effect
  useEffect(() => {
    if (!session) return;
    
    if (session.status === 'active' && session.started_at) {
      const interval = setInterval(() => {
        const startTime = new Date(session.started_at!).getTime();
        const now = Date.now();
        const totalElapsed = Math.floor((now - startTime) / 1000);
        const adjustedElapsed = totalElapsed - (session.total_paused_seconds || 0);
        setElapsedSeconds(Math.max(0, adjustedElapsed));
      }, 1000);
      
      return () => clearInterval(interval);
    } else if (session.status === 'paused' && session.started_at && session.paused_at) {
      const startTime = new Date(session.started_at).getTime();
      const pauseTime = new Date(session.paused_at).getTime();
      const elapsed = Math.floor((pauseTime - startTime) / 1000) - (session.total_paused_seconds || 0);
      setElapsedSeconds(Math.max(0, elapsed));
    } else if (session.status === 'completed' && session.actual_duration_seconds) {
      setElapsedSeconds(session.actual_duration_seconds);
    }
  }, [session]);

  const handleStart = useCallback(() => {
    updateSession.mutate({
      status: 'active',
      started_at: new Date().toISOString(),
    });
    toast({ title: 'Session started!' });
  }, [updateSession, toast]);

  const handlePause = useCallback(() => {
    if (!session?.started_at) return;
    
    updateSession.mutate({
      status: 'paused',
      paused_at: new Date().toISOString(),
    });
    toast({ title: 'Session paused' });
  }, [session, updateSession, toast]);

  const handleResume = useCallback(() => {
    if (!session?.paused_at) return;
    
    const pausedAt = new Date(session.paused_at).getTime();
    const now = Date.now();
    const additionalPausedSeconds = Math.floor((now - pausedAt) / 1000);
    
    updateSession.mutate({
      status: 'active',
      paused_at: null,
      total_paused_seconds: (session.total_paused_seconds || 0) + additionalPausedSeconds,
    });
    toast({ title: 'Session resumed!' });
  }, [session, updateSession, toast]);

  const handleEnd = useCallback(() => {
    if (!session?.started_at) return;
    
    let finalDuration = elapsedSeconds;
    
    // If paused, calculate duration up to pause
    if (session.status === 'paused' && session.paused_at) {
      const startTime = new Date(session.started_at).getTime();
      const pauseTime = new Date(session.paused_at).getTime();
      finalDuration = Math.floor((pauseTime - startTime) / 1000) - (session.total_paused_seconds || 0);
    }
    
    updateSession.mutate({
      status: 'completed',
      ended_at: new Date().toISOString(),
      actual_duration_seconds: finalDuration,
    });
    toast({ title: 'Session ended!' });
  }, [session, elapsedSeconds, updateSession, toast]);

  // Format time display
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Timer className="h-12 w-12 animate-pulse mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">Session not found</p>
            <Button onClick={() => navigate('/estimate')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Estimator
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show end screen if completed
  if (session.status === 'completed') {
    return (
      <SessionEndScreen 
        session={session}
        elapsedSeconds={session.actual_duration_seconds || elapsedSeconds}
      />
    );
  }

  const selection = session.selections_json as EstimatorSelection | null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/estimate')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Session Timer</h1>
              <p className="text-sm text-muted-foreground">
                {session.session_type === 'diy' ? 'DIY Session' : 'EXP Session'}
              </p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            session.status === 'active' 
              ? 'bg-green-500/10 text-green-500' 
              : session.status === 'paused'
              ? 'bg-yellow-500/10 text-yellow-500'
              : 'bg-muted text-muted-foreground'
          }`}>
            {session.status === 'active' ? '● Active' : 
             session.status === 'paused' ? '⏸ Paused' : 
             '○ Pending'}
          </div>
        </div>

        {/* Timer Display */}
        <Card className="mb-6">
          <CardContent className="py-12 text-center">
            <div className="text-6xl md:text-8xl font-mono font-bold tracking-wider mb-8">
              {formatTime(elapsedSeconds)}
            </div>
            
            {/* Timer Controls */}
            <div className="flex justify-center gap-4">
              {session.status === 'pending' && (
                <Button 
                  size="lg" 
                  onClick={handleStart}
                  disabled={updateSession.isPending}
                  className="min-w-32"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start
                </Button>
              )}
              
              {session.status === 'active' && (
                <>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={handlePause}
                    disabled={updateSession.isPending}
                    className="min-w-32"
                  >
                    <Pause className="h-5 w-5 mr-2" />
                    Pause
                  </Button>
                  <Button 
                    size="lg" 
                    variant="destructive"
                    onClick={handleEnd}
                    disabled={updateSession.isPending}
                    className="min-w-32"
                  >
                    <Square className="h-5 w-5 mr-2" />
                    End
                  </Button>
                </>
              )}
              
              {session.status === 'paused' && (
                <>
                  <Button 
                    size="lg" 
                    onClick={handleResume}
                    disabled={updateSession.isPending}
                    className="min-w-32"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Resume
                  </Button>
                  <Button 
                    size="lg" 
                    variant="destructive"
                    onClick={handleEnd}
                    disabled={updateSession.isPending}
                    className="min-w-32"
                  >
                    <Square className="h-5 w-5 mr-2" />
                    End
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Session Breakdown */}
          <SessionBreakdown selection={selection} />
          
          {/* Live Cost Display */}
          <LiveCostDisplay 
            selection={selection} 
            elapsedSeconds={elapsedSeconds}
            originalTotal={session.original_total}
          />
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Archive, 
  Trash2, 
  Eye, 
  DollarSign, 
  TrendingUp, 
  Users,
  FileText,
  Video,
  Camera,
  Layers,
  Building,
  ExternalLink
} from 'lucide-react';
import { useAdminLogs, useArchiveAdminLog, useDeleteAdminLog, useAdminLogStats, LogType } from '@/hooks/useAdminLogs';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const LOG_TYPE_LABELS: Record<LogType, string> = {
  studio_estimate: 'Studio Estimate',
  photo_editing: 'Photo Editing',
  video_editing: 'Video Editing',
  team_project: 'Team Project',
  internal_ops: 'Internal Ops',
};

const LOG_TYPE_ICONS: Record<LogType, React.ReactNode> = {
  studio_estimate: <Building className="h-4 w-4" />,
  photo_editing: <Camera className="h-4 w-4" />,
  video_editing: <Video className="h-4 w-4" />,
  team_project: <Users className="h-4 w-4" />,
  internal_ops: <Layers className="h-4 w-4" />,
};

export function LoggedExamplesEditor() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<LogType | 'all'>('all');
  const { data: logs, isLoading } = useAdminLogs(filter);
  const stats = useAdminLogStats();
  const archiveMutation = useArchiveAdminLog();
  const deleteMutation = useDeleteAdminLog();
  const { toast } = useToast();

  const handleOpenInEditor = (logId: string, logType: LogType) => {
    if (logType === 'team_project') {
      navigate(`/projects?logId=${logId}`);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveMutation.mutateAsync(id);
      toast({ title: 'Log archived' });
    } catch {
      toast({ title: 'Failed to archive', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: 'Log deleted' });
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const activeLogs = logs?.filter(l => l.status === 'active') || [];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Logs</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalLogs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Revenue</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Payouts</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPayouts)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Avg Margin</span>
            </div>
            <div className="text-2xl font-bold">{stats.avgMarginPercent.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Type Breakdown */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(stats.byType) as LogType[]).map(type => (
          <Badge key={type} variant="outline" className="gap-1">
            {LOG_TYPE_ICONS[type]}
            {LOG_TYPE_LABELS[type]}: {stats.byType[type]}
          </Badge>
        ))}
      </div>

      {/* Filter & Table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Logged Examples</CardTitle>
            <CardDescription>
              All saved estimates and projects from various flows
            </CardDescription>
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as LogType | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="studio_estimate">Studio Estimates</SelectItem>
              <SelectItem value="photo_editing">Photo Editing</SelectItem>
              <SelectItem value="video_editing">Video Editing</SelectItem>
              <SelectItem value="team_project">Team Projects</SelectItem>
              <SelectItem value="internal_ops">Internal Ops</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
          ) : activeLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No logged examples yet. Save estimates from the various flows to see them here.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Payout</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        {LOG_TYPE_ICONS[log.log_type]}
                        {LOG_TYPE_LABELS[log.log_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.log_name || '(Unnamed)'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(log.customer_total)}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {log.provider_payout ? `-${formatCurrency(log.provider_payout)}` : '—'}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(log.gross_margin)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(log.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {log.log_type === 'team_project' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenInEditor(log.id, log.log_type)}
                            title="Open in Editor"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{log.log_name || LOG_TYPE_LABELS[log.log_type]}</DialogTitle>
                              <DialogDescription>
                                Created on {format(new Date(log.created_at), 'MMMM d, yyyy h:mm a')}
                              </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="max-h-[60vh]">
                              <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
                                {JSON.stringify(log.data_json, null, 2)}
                              </pre>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleArchive(log.id)}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(log.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pencil, Copy, Trash2, CheckCircle, XCircle } from 'lucide-react';
import type { StudioBooking } from '@/hooks/useStudioBookings';

interface BookingContextMenuProps {
  booking: StudioBooking;
  children: React.ReactNode;
  onViewEdit: () => void;
  onDuplicate: () => void;
  onCancel: (scope: 'occurrence' | 'from_here' | 'series') => void;
  onApprove?: () => void;
  onReject?: () => void;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  isAdmin?: boolean;
}

export function BookingContextMenu({
  booking,
  children,
  onViewEdit,
  onDuplicate,
  onCancel,
  onApprove,
  onReject,
  disabled = false,
  onOpenChange,
  isAdmin = false,
}: BookingContextMenuProps) {
  const isRepeatBooking = !!booking.repeat_series_id;
  const isCancelled = booking.status === 'cancelled';
  const isPendingApproval = booking.status === 'pending' && booking.requires_approval;
  const isApproved = booking.status === 'approved';

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={onViewEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          View/edit details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </DropdownMenuItem>
        
        {/* Admin approval actions for pending recurring bookings */}
        {isAdmin && isPendingApproval && isRepeatBooking && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onApprove}
              className="text-green-600 focus:text-green-600"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Series
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={onReject}
              className="text-destructive focus:text-destructive"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject Series
            </DropdownMenuItem>
          </>
        )}
        
        {!isCancelled && !isPendingApproval && !isApproved && (
          <>
            <DropdownMenuSeparator />
            
            {isRepeatBooking ? (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove...
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem 
                    onClick={() => onCancel('occurrence')}
                    className="text-destructive focus:text-destructive"
                  >
                    ...this occurrence
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onCancel('from_here')}
                    className="text-destructive focus:text-destructive"
                  >
                    ...this and following
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onCancel('series')}
                    className="text-destructive focus:text-destructive"
                  >
                    ...the full series
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ) : (
              <DropdownMenuItem 
                onClick={() => onCancel('occurrence')}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
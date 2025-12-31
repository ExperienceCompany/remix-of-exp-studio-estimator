// Get generic label for booking type (for non-admin/staff)
export const getGenericBookingLabel = (bookingType: string) => {
  switch (bookingType) {
    case 'customer':
      return 'Studio Booking';
    case 'internal':
      return 'Internal Event';
    case 'unavailable':
      return 'Unavailable';
    default:
      return 'Reserved';
  }
};

// Get display text based on role
export const getBookingDisplayText = (
  booking: { title: string | null; customer_name: string | null; booking_type: string },
  isStaffOrAdmin: boolean
) => {
  if (isStaffOrAdmin) {
    // Show: "Customer Name: Title" or just title/customer_name
    if (booking.customer_name && booking.title) {
      return `${booking.customer_name}: ${booking.title}`;
    }
    return booking.title || booking.customer_name || booking.booking_type;
  }
  // Non-admin: show generic label
  return getGenericBookingLabel(booking.booking_type);
};

export interface BookingInvitee {
  name: string;
  email: string;
  timezone: string;
}

export interface BookingQA {
  question: string;
  answer: string;
}

export interface Booking {
  id: number;
  uuid: string; // Calendly event UUID for API calls
  start: Date;
  end: Date;
  title: string;
  host: string;
  location: string;
  meetingUrl: string; // Google Meet/Zoom link for joining
  status: "Active" | "Canceled";
  invitee: BookingInvitee;
  qa: BookingQA[];
  rescheduleUrl: string;
  cancelUrl: string;
}

export interface BookingFilters {
  dateFilter: "all" | "upcoming" | "today" | "next7days";
  statusFilter: "all" | "active" | "canceled";
  hostFilter?: string; // Client-side filter only
  searchQuery?: string; // Client-side filter only
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
}

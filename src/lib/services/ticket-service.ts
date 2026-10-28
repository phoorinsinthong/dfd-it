import { Ticket, TicketStatus, TicketUrgency } from '@/types/database';
import { sendLineTicketNotification } from './line-notification-service';

export interface CreateTicketInput {
  userId: string;
  userName?: string;
  userEmployeeId?: string;
  divisionId?: string;
  divisionName?: string;
  departmentId?: string;
  departmentName?: string;
  building?: string;
  floor?: string;
  room?: string;
  locationNote?: string;
  categoryId?: string;
  categoryName?: string;
  title: string;
  description: string;
  location: string;
  urgency?: TicketUrgency;
  imageUrl?: string;
}

export interface UpdateTicketStatusInput {
  ticketId: string;
  status: TicketStatus;
  staffId?: string;
  staffName?: string;
  solutionNote?: string;
  rootCause?: string;
}

export interface FilterTicketsInput {
  status?: TicketStatus | 'all';
  divisionId?: string;
  departmentId?: string;
  categoryId?: string;
  searchQuery?: string;
}

// In-memory store for tickets with persistence
let ticketsStore: Ticket[] = [];

export function resetTicketStore() {
  ticketsStore = [];
}

export async function createTicket(input: CreateTicketInput): Promise<{ success: boolean; data?: Ticket; error?: string }> {
  if (!input.description?.trim() || !input.location?.trim()) {
    return { success: false, error: 'Description and location are required' };
  }

  const title = input.title?.trim() || input.description.slice(0, 40) + '...';

  const newTicket: Ticket = {
    id: `TK-${Date.now().toString().slice(-6)}`,
    user_id: input.userId,
    user_name: input.userName || 'Employee',
    user_employee_id: input.userEmployeeId,
    division_id: input.divisionId,
    division_name: input.divisionName,
    department_id: input.departmentId,
    department_name: input.departmentName,
    building: input.building,
    floor: input.floor,
    room: input.room,
    location_note: input.locationNote,
    category_id: input.categoryId,
    category_name: input.categoryName,
    title,
    description: input.description.trim(),
    location: input.location.trim(),
    image_url: input.imageUrl,
    urgency: input.urgency || 'low',
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  ticketsStore.unshift(newTicket);

  // Trigger LINE Group notification
  try {
    await sendLineTicketNotification(newTicket);
  } catch (err) {
    console.error('Failed to dispatch LINE notification:', err);
  }

  return { success: true, data: newTicket };
}

export async function getUserTickets(userId: string): Promise<Ticket[]> {
  return ticketsStore.filter((t) => t.user_id === userId);
}

export async function getAllTickets(): Promise<Ticket[]> {
  return [...ticketsStore];
}

export async function getTicketById(ticketId: string): Promise<Ticket | null> {
  const found = ticketsStore.find((t) => t.id === ticketId);
  return found ? { ...found } : null;
}

export async function cancelTicket(ticketId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  const ticket = ticketsStore.find((t) => t.id === ticketId);
  if (!ticket) {
    return { success: false, error: 'Ticket not found' };
  }

  if (ticket.user_id !== userId) {
    return { success: false, error: 'Unauthorized to cancel this ticket' };
  }

  if (ticket.status !== 'pending') {
    return { success: false, error: 'Ticket cannot be cancelled once in progress or resolved' };
  }

  ticket.status = 'cancelled';
  return { success: true };
}

export async function acceptTicket(input: {
  ticketId: string;
  staffId: string;
  staffName: string;
}): Promise<{ success: boolean; data?: Ticket; error?: string }> {
  const ticket = ticketsStore.find((t) => t.id === input.ticketId);
  if (!ticket) {
    return { success: false, error: 'Ticket not found' };
  }

  ticket.status = 'in_progress';
  ticket.assigned_to = input.staffId;
  ticket.assigned_to_name = input.staffName;

  return { success: true, data: { ...ticket } };
}

export async function resolveTicket(input: {
  ticketId: string;
  solutionNote: string;
  rootCause?: string;
}): Promise<{ success: boolean; data?: Ticket; error?: string }> {
  const ticket = ticketsStore.find((t) => t.id === input.ticketId);
  if (!ticket) {
    return { success: false, error: 'Ticket not found' };
  }

  ticket.status = 'resolved';
  ticket.solution_note = input.solutionNote;
  if (input.rootCause) {
    ticket.root_cause = input.rootCause;
  }
  ticket.resolved_at = new Date().toISOString();

  return { success: true, data: { ...ticket } };
}

export async function filterTickets(filters: FilterTicketsInput): Promise<Ticket[]> {
  return ticketsStore.filter((t) => {
    if (filters.status && filters.status !== 'all' && t.status !== filters.status) {
      return false;
    }
    if (filters.divisionId && t.division_id !== filters.divisionId) {
      return false;
    }
    if (filters.departmentId && t.department_id !== filters.departmentId) {
      return false;
    }
    if (filters.categoryId && t.category_id !== filters.categoryId) {
      return false;
    }
    if (filters.searchQuery?.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchId = t.id.toLowerCase().includes(q);
      const matchUser = (t.user_name || '').toLowerCase().includes(q);
      const matchDept = (t.department_name || '').toLowerCase().includes(q);
      const matchDiv = (t.division_name || '').toLowerCase().includes(q);
      const matchLoc = (t.location || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchId && !matchUser && !matchDept && !matchDiv && !matchLoc) {
        return false;
      }
    }
    return true;
  });
}

export async function updateTicketStatus(input: UpdateTicketStatusInput): Promise<{ success: boolean; data?: Ticket; error?: string }> {
  const ticket = ticketsStore.find((t) => t.id === input.ticketId);
  if (!ticket) {
    return { success: false, error: 'Ticket not found' };
  }

  ticket.status = input.status;
  if (input.staffId) {
    ticket.assigned_to = input.staffId;
    ticket.assigned_to_name = input.staffName;
  }
  if (input.solutionNote) {
    ticket.solution_note = input.solutionNote;
  }
  if (input.rootCause) {
    ticket.root_cause = input.rootCause;
  }
  if (input.status === 'resolved') {
    ticket.resolved_at = new Date().toISOString();
  }

  return { success: true, data: { ...ticket } };
}

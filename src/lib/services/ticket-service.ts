import { Ticket, TicketStatus } from '@/types/database';

export interface CreateTicketInput {
  userId: string;
  userName?: string;
  userEmployeeId?: string;
  departmentId?: string;
  departmentName?: string;
  categoryId?: string;
  categoryName?: string;
  title: string;
  description: string;
  location: string;
  imageUrl?: string;
}

export interface UpdateTicketStatusInput {
  ticketId: string;
  status: TicketStatus;
  staffId?: string;
  staffName?: string;
  solutionNote?: string;
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
    department_id: input.departmentId,
    department_name: input.departmentName,
    category_id: input.categoryId,
    category_name: input.categoryName,
    title,
    description: input.description.trim(),
    location: input.location.trim(),
    image_url: input.imageUrl,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  ticketsStore.unshift(newTicket);
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
  if (input.status === 'resolved') {
    ticket.resolved_at = new Date().toISOString();
  }

  return { success: true, data: { ...ticket } };
}

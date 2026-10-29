import { Ticket, TicketStatus, TicketUrgency } from '@/types/database';
import { sendLineTicketNotification } from './line-notification-service';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

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

  if (isSupabaseConfigured()) {
    try {
      // Upsert user if needed so foreign key doesn't block ticket creation
      await supabase.from('users').upsert({
        id: input.userId,
        name: input.userName || 'Employee',
        employee_id: input.userEmployeeId,
        division_id: input.divisionId?.trim() || null,
        department_id: input.departmentId?.trim() || null,
        role: 'user',
      }, { onConflict: 'id' });

      // Build payload matching database columns
      const insertPayload: Record<string, any> = {
        user_id: newTicket.user_id,
        user_name: newTicket.user_name,
        user_employee_id: newTicket.user_employee_id,
        division_id: newTicket.division_id?.trim() || null,
        division_name: newTicket.division_name?.trim() || null,
        department_id: newTicket.department_id?.trim() || null,
        department_name: newTicket.department_name?.trim() || null,
        building: newTicket.building,
        floor: newTicket.floor,
        room: newTicket.room,
        location_note: newTicket.location_note,
        category_id: newTicket.category_id?.trim() || null,
        category_name: newTicket.category_name?.trim() || null,
        title: newTicket.title,
        description: newTicket.description,
        location: newTicket.location,
        image_url: newTicket.image_url,
        urgency: newTicket.urgency,
        status: newTicket.status,
        created_at: newTicket.created_at,
      };

      // If newTicket.id is already UUID or table allows TEXT, include it; otherwise let gen_random_uuid() assign
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newTicket.id);
      if (isUuid) {
        insertPayload.id = newTicket.id;
      }

      let { data: dbTicket, error } = await supabase.from('tickets').insert(insertPayload).select().single();

      // If rejected due to UUID syntax error on non-UUID id, retry without id so PostgreSQL gen_random_uuid() generates it
      if (error && (error.code === '22P02' || error.code === '23502')) {
        delete insertPayload.id;
        const retryRes = await supabase.from('tickets').insert(insertPayload).select().single();
        if (!retryRes.error && retryRes.data) {
          dbTicket = retryRes.data;
          error = null;
        }
      }

      if (error) {
        console.warn('Supabase createTicket warning:', error);
      } else if (dbTicket) {
        newTicket.id = dbTicket.id;
        if (ticketsStore[0]) {
          ticketsStore[0].id = dbTicket.id;
        }
      }
    } catch (e) {
      console.warn('Supabase createTicket exception:', e);
    }
  }

  // Trigger LINE Group notification
  try {
    await sendLineTicketNotification(newTicket);
  } catch (err) {
    console.error('Failed to dispatch LINE notification:', err);
  }

  return { success: true, data: newTicket };
}

export async function getUserTickets(userId: string): Promise<Ticket[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && data) {
        return data as Ticket[];
      }
    } catch (e) {
      console.warn('Supabase getUserTickets warning:', e);
    }
  }
  return ticketsStore.filter((t) => t.user_id === userId);
}

export async function getAllTickets(): Promise<Ticket[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        ticketsStore = data as Ticket[];
        return [...ticketsStore];
      }
    } catch (e) {
      console.warn('Supabase getAllTickets warning:', e);
    }
  }
  return [...ticketsStore];
}

export async function getTicketById(ticketId: string): Promise<Ticket | null> {
  const found = ticketsStore.find((t) => t.id === ticketId);
  if (found) return { ...found };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .maybeSingle();
      if (!error && data) {
        return data as Ticket;
      }
    } catch (e) {
      console.warn('Supabase getTicketById warning:', e);
    }
  }

  return null;
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

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('tickets').update({ status: 'cancelled' }).eq('id', ticketId);
    } catch (e) {
      console.warn('Supabase cancelTicket warning:', e);
    }
  }

  return { success: true };
}

export async function acceptTicket(input: {
  ticketId: string;
  staffId: string;
  staffName: string;
}): Promise<{ success: boolean; data?: Ticket; error?: string }> {
  let ticket = ticketsStore.find((t) => t.id === input.ticketId);
  if (!ticket) {
    const fetched = await getTicketById(input.ticketId);
    if (fetched) {
      ticket = fetched;
      ticketsStore.unshift(ticket);
    }
  }

  if (!ticket) {
    return { success: false, error: 'ไม่พบใบแจ้งซ่อมที่ระบุ' };
  }

  ticket.status = 'in_progress';
  ticket.assigned_to = input.staffId;
  ticket.assigned_to_name = input.staffName;

  if (isSupabaseConfigured()) {
    try {
      // 1. Upsert staff into users table first so foreign key tickets_assigned_to_fkey constraint is always satisfied
      await supabase.from('users').upsert({
        id: input.staffId,
        name: input.staffName,
        role: 'admin',
      }, { onConflict: 'id' });

      // 2. Update tickets table in Supabase
      const { data: updated, error: updateErr } = await supabase.from('tickets').update({
        status: 'in_progress',
        assigned_to: input.staffId,
        assigned_to_name: input.staffName,
      }).eq('id', input.ticketId).select().maybeSingle();

      if (updateErr) {
        console.warn('Supabase acceptTicket warning:', updateErr);
        // Fallback: If foreign key error occurs, update status and staff name without assigned_to id
        if (updateErr.code === '23503') {
          await supabase.from('tickets').update({
            status: 'in_progress',
            assigned_to_name: input.staffName,
          }).eq('id', input.ticketId);
        }
      } else if (updated) {
        ticket.status = updated.status;
        ticket.assigned_to = updated.assigned_to;
        ticket.assigned_to_name = updated.assigned_to_name;
      }
    } catch (e) {
      console.warn('Supabase acceptTicket exception:', e);
    }
  }

  return { success: true, data: { ...ticket } };
}

export async function resolveTicket(input: {
  ticketId: string;
  solutionNote: string;
  rootCause?: string;
}): Promise<{ success: boolean; data?: Ticket; error?: string }> {
  let ticket = ticketsStore.find((t) => t.id === input.ticketId);
  if (!ticket) {
    const fetched = await getTicketById(input.ticketId);
    if (fetched) {
      ticket = fetched;
      ticketsStore.unshift(ticket);
    }
  }

  if (!ticket) {
    return { success: false, error: 'ไม่พบใบแจ้งซ่อมที่ระบุ' };
  }

  ticket.status = 'resolved';
  ticket.solution_note = input.solutionNote;
  if (input.rootCause) {
    ticket.root_cause = input.rootCause;
  }
  ticket.resolved_at = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('tickets').update({
        status: 'resolved',
        solution_note: input.solutionNote,
        root_cause: input.rootCause,
        resolved_at: ticket.resolved_at,
      }).eq('id', input.ticketId);
    } catch (e) {
      console.warn('Supabase resolveTicket warning:', e);
    }
  }

  return { success: true, data: { ...ticket } };
}

export async function filterTickets(filters: FilterTicketsInput): Promise<Ticket[]> {
  const all = await getAllTickets();
  return all.filter((t) => {
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

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('tickets').update({
        status: input.status,
        assigned_to: input.staffId || ticket.assigned_to,
        assigned_to_name: input.staffName || ticket.assigned_to_name,
        solution_note: input.solutionNote || ticket.solution_note,
        root_cause: input.rootCause || ticket.root_cause,
        resolved_at: ticket.resolved_at,
      }).eq('id', input.ticketId);
    } catch (e) {
      console.warn('Supabase updateTicketStatus warning:', e);
    }
  }

  return { success: true, data: { ...ticket } };
}

import { AuditLog, AuditAction, AuditModule } from '@/types/database';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

let auditLogsStore: AuditLog[] = [];

export function resetAuditLogStore() {
  auditLogsStore = [];
}

export interface RecordAuditLogInput {
  actorId: string;
  actorName: string;
  actorEmail?: string;
  actorRole: string;
  action: AuditAction;
  module: AuditModule;
  targetId?: string;
  targetName?: string;
  details: string;
}

export async function recordAuditLog(input: RecordAuditLogInput): Promise<AuditLog> {
  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    actor_id: input.actorId,
    actor_name: input.actorName,
    actor_email: input.actorEmail,
    actor_role: input.actorRole,
    action: input.action,
    module: input.module,
    target_id: input.targetId,
    target_name: input.targetName,
    details: input.details,
  };

  auditLogsStore.unshift(newLog);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('audit_logs').insert({
        id: newLog.id,
        timestamp: newLog.timestamp,
        actor_id: newLog.actor_id,
        actor_name: newLog.actor_name,
        actor_email: newLog.actor_email,
        actor_role: newLog.actor_role,
        action: newLog.action,
        module: newLog.module,
        target_id: newLog.target_id,
        target_name: newLog.target_name,
        details: newLog.details,
      });
    } catch (e) {
      console.warn('Supabase recordAuditLog warning:', e);
    }
  }

  return { ...newLog };
}

export interface GetAuditLogsFilter {
  module?: AuditModule | 'all';
  action?: AuditAction | 'all';
  actorId?: string;
  search?: string;
  limit?: number;
}

export async function getAuditLogs(filter?: GetAuditLogsFilter): Promise<AuditLog[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      if (!error && data && data.length > 0) {
        auditLogsStore = data as AuditLog[];
      }
    } catch (e) {
      console.warn('Supabase getAuditLogs warning:', e);
    }
  }

  let logs = [...auditLogsStore];

  if (filter?.module && filter.module !== 'all') {
    logs = logs.filter((l) => l.module === filter.module);
  }

  if (filter?.action && filter.action !== 'all') {
    logs = logs.filter((l) => l.action === filter.action);
  }

  if (filter?.actorId) {
    logs = logs.filter((l) => l.actor_id === filter.actorId);
  }

  if (filter?.search?.trim()) {
    const q = filter.search.toLowerCase();
    logs = logs.filter((l) => {
      const matchActor = l.actor_name.toLowerCase().includes(q) || (l.actor_email || '').toLowerCase().includes(q);
      const matchDetails = l.details.toLowerCase().includes(q);
      const matchTarget = (l.target_name || '').toLowerCase().includes(q) || (l.target_id || '').toLowerCase().includes(q);
      return matchActor || matchDetails || matchTarget;
    });
  }

  if (filter?.limit && filter.limit > 0) {
    logs = logs.slice(0, filter.limit);
  }

  return logs;
}

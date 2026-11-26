import { supabase } from '@/shared/api/supabase';

export type PendingReschedule = { id: string; mine: boolean; by: string; new_starts_at: string; old_starts_at: string; expires_at: string };
export type RescheduleState = { pending: PendingReschedule | null; accepted: number; total: number; can_propose: boolean };
export type RescheduleError = 'soon' | 'far' | 'same' | 'late' | 'limit' | 'pending' | 'other';

export async function getReschedule(proposalId: string): Promise<RescheduleState | null> {
  const { data, error } = await supabase.rpc('get_reschedule', { p_proposal: proposalId });
  return error ? null : (data as RescheduleState | null);
}

export function classifyRescheduleError(message: string): RescheduleError {
  if (message.includes('too late')) return 'late';
  if (message.includes('too soon')) return 'soon';
  if (message.includes('too far')) return 'far';
  if (message.includes('same time')) return 'same';
  if (message.includes('limit')) return 'limit';
  if (message.includes('date_reschedules_one_pending')) return 'pending';
  return 'other';
}

export async function proposeReschedule(proposalId: string, newStartsAt: Date): Promise<{ error?: RescheduleError }> {
  const { error } = await supabase.rpc('propose_reschedule', { p_proposal: proposalId, p_new_starts: newStartsAt.toISOString() });
  return error ? { error: classifyRescheduleError(error.message) } : {};
}

export async function respondReschedule(id: string, accept: boolean): Promise<'accepted' | 'declined' | 'expired' | 'error'> {
  const { data, error } = await supabase.rpc('respond_reschedule', { p_id: id, p_accept: accept });
  return error ? 'error' : (data as 'accepted' | 'declined' | 'expired');
}

export async function cancelReschedule(id: string): Promise<void> {
  await supabase.rpc('cancel_reschedule', { p_id: id });
}

import { supabase } from '@/shared/api/supabase';

export type CheckinStatus = 'none' | 'arrived' | 'ok' | 'home' | 'left';
export type MyShare = { share: { trusted_id: string; trusted_name: string; checkin: CheckinStatus; checkin_at: string | null; events: number } | null; window_open: boolean };
export type SharedWithMe = { share_id: string; single_first_name: string; place: string; address: string | null; starts_at: string; checkin: CheckinStatus; checkin_at: string | null };
export type FriendLite = { id: string; first_name: string };

export async function getMyShare(proposalId: string): Promise<MyShare | null> {
  const { data, error } = await supabase.rpc('get_my_share', { p_proposal: proposalId });
  return error ? null : (data as MyShare | null);
}
export async function shareDate(proposalId: string, friendId: string): Promise<boolean> {
  const { error } = await supabase.rpc('share_date_with_friend', { p_proposal: proposalId, p_friend: friendId });
  return !error;
}
export async function revokeShare(proposalId: string): Promise<void> { await supabase.rpc('revoke_date_share', { p_proposal: proposalId }); }
export async function checkin(proposalId: string, status: Exclude<CheckinStatus, 'none'>): Promise<boolean> {
  const { error } = await supabase.rpc('safety_checkin', { p_proposal: proposalId, p_status: status });
  return !error;
}
export async function getSharedWithMe(): Promise<SharedWithMe[]> {
  const { data } = await supabase.rpc('get_shared_with_me');
  return (data as SharedWithMe[]) ?? [];
}
export async function respondShare(shareId: string, accept: boolean): Promise<void> { await supabase.rpc('respond_date_share', { p_share: shareId, p_accept: accept }); }

/** Accepted friends, excluding the people who are on this date. */
export async function getFriendsLite(myId: string): Promise<FriendLite[]> {
  const { data: fs } = await supabase.from('friendships').select('requester,addressee').eq('status', 'accepted');
  const ids = (fs ?? []).map((f: any) => (f.requester === myId ? f.addressee : f.requester));
  if (!ids.length) return [];
  const { data: ps } = await supabase.from('profiles').select('id,first_name').in('id', ids);
  return (ps as FriendLite[]) ?? [];
}

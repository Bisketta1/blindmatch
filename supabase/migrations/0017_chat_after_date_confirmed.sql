-- Matchmakers keep chatting after the date is confirmed (status 'dated'): details, address, changes.
-- Added as a second permissive INSERT policy so nothing has to be dropped.
create policy messages_insert_dated on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and private.is_match_owner(match_id, auth.uid())
    and exists (select 1 from public.matches m where m.id = messages.match_id and m.status = 'dated')
  );

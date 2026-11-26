import React, { useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import type { ReplyFlightHandle } from '@/components/ReplyFlight';

export const REPLY_STYLES = [
  { color: '#A8432F', tint: '#F7E9E1', fg: '#8F3826' },
  { color: '#C9A26B', tint: '#F5ECD9', fg: '#6E4E1C' },
  { color: '#2F7D5B', tint: '#E3F0E8', fg: '#22573F' },
  { color: '#2A201C', tint: '#ECE6E0', fg: '#2A201C' },
  { color: '#B64F39', tint: '#F9E4DD', fg: '#8F3826' },
];

/** Row of quick replies. Tapping one flies it into the chat (see ReplyFlight) and then sends it. */
export function QuickReplies({ replies, flight, landing, onSend }: {
  replies: string[]; flight: React.RefObject<ReplyFlightHandle | null>; landing: React.RefObject<any>; onSend: (text: string) => void;
}) {
  const refs = useRef<any[]>([]);

  function press(i: number) {
    const chip = refs.current[i]; const area = landing.current;
    if (!chip || !area || !flight.current) { onSend(replies[i]); return; }
    area.measureInWindow((ax: number, ay: number, aw: number, ah: number) => {
      chip.measureInWindow((x: number, y: number, w: number, h: number) => {
        const st = REPLY_STYLES[i % REPLY_STYLES.length];
        const bubbleW = Math.min(aw * 0.82, w + 8);
        flight.current?.play({
          text: replies[i], color: st.color, tint: st.tint, fg: st.fg,
          from: { x, y, w, h },
          to: { x: ax + aw - 18 - bubbleW / 2, y: ay + ah - 78 },
          onLand: () => onSend(replies[i]),
        });
      });
    });
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingVertical: 8 }}>
      {replies.map((q, i) => {
        const st = REPLY_STYLES[i % REPLY_STYLES.length];
        return (
          <View key={q} ref={(r) => { refs.current[i] = r; }} collapsable={false}>
            <Pressable onPress={() => press(i)} style={({ pressed }) => ({ backgroundColor: st.tint, borderRadius: 22, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center', transform: [{ scale: pressed ? 0.96 : 1 }] })}>
              <Text style={{ color: st.fg, fontWeight: '700', fontSize: 15 }}>{q}</Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

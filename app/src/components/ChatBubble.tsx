import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

/** Message bubble: mine = deep terracotta with a gentle gradient, theirs = white with a hairline. Soft shadow, one tighter corner. */
export function ChatBubble({ mine, text, time }: { mine: boolean; text: string; time?: string }) {
  const radius = { borderRadius: 22, borderBottomRightRadius: mine ? 7 : 22, borderBottomLeftRadius: mine ? 22 : 7 };
  const shadow = { shadowColor: mine ? '#7A2A1A' : '#3A2418', shadowOpacity: mine ? 0.22 : 0.07, shadowRadius: mine ? 12 : 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 };
  return (
    <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%', marginBottom: 10 }}>
      {mine ? (
        <LinearGradient colors={['#B64F39', '#9A3A27']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[radius, shadow, { paddingHorizontal: 16, paddingVertical: 12 }]}>
          <Text style={{ color: '#fff', fontSize: 16, lineHeight: 22 }}>{text}</Text>
        </LinearGradient>
      ) : (
        <View style={[radius, shadow, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, paddingVertical: 12 }]}>
          <Text style={{ color: colors.text, fontSize: 16, lineHeight: 22 }}>{text}</Text>
        </View>
      )}
      {time ? <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, alignSelf: mine ? 'flex-end' : 'flex-start', marginHorizontal: 6 }}>{time}</Text> : null}
    </View>
  );
}

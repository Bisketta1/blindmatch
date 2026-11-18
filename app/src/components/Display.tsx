import React from 'react';
import { Platform, Text, TextProps } from 'react-native';
import { colors, fonts } from '../theme';

/** Serif display text for titles. One weight only (Android ignores fontWeight on custom fonts). */
export function Display({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[{ fontFamily: fonts.display, color: colors.text, letterSpacing: Platform.OS === 'web' ? -0.3 : 0 }, style]} />;
}

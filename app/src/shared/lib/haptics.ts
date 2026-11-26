import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const run = (fn: () => Promise<void>) => { if (Platform.OS === 'web') return; fn().catch(() => {}); };
export const hapticError = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
export const hapticSuccess = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const hapticTick = () => run(() => Haptics.selectionAsync());
export const hapticLight = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const hapticMedium = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

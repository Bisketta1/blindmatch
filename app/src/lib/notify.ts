import { Alert, Platform } from 'react-native';

/** Alert that also works on web (Alert.alert is a no-op there). */
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

import { AccessibilityInfo } from 'react-native';

let reduced = false;
AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduced = v; }).catch(() => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => { reduced = v; });

/** True when the user asked the OS to reduce motion. Decorative animations should be skipped or shortened. */
export const reduceMotion = () => reduced;

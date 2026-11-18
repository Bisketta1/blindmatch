import { Platform } from 'react-native';

let player: any = null;
let audioCtx: any = null;

/** Short mechanical "tick" used while scrolling the wheels. Fails silently if audio is unavailable. */
export function playTick() {
  try {
    if (Platform.OS === 'web') {
      const AC = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
      if (!AC) return;
      audioCtx = audioCtx || new AC();
      const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
      o.frequency.value = 2200; g.gain.setValueAtTime(0.12, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.03);
      o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.035);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createAudioPlayer, setAudioModeAsync } = require('expo-audio');
    if (!player) {
      player = createAudioPlayer(require('../../assets/tick.wav'));
      setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    }
    player.seekTo(0);
    player.play();
  } catch { /* ignore */ }
}

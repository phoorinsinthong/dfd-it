/**
 * Audio Alert Service for Helpdesk Notifications
 * Synthesizes crisp bell chimes using Web Audio API
 * 100% Free, zero external audio asset dependencies, zero network latency
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (e) {
    console.warn('AudioContext not available:', e);
    return null;
  }
}

let inMemorySoundEnabled = true;

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return inMemorySoundEnabled;
  const stored = localStorage.getItem('it_admin_sound_alert');
  return stored !== 'false'; // default is true
}

export function setSoundEnabled(enabled: boolean): void {
  inMemorySoundEnabled = enabled;
  if (typeof window === 'undefined') return;
  localStorage.setItem('it_admin_sound_alert', enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('sound-setting-changed', { detail: { enabled } }));
}

/**
 * Play a two-tone ascending chime (E5 -> A5)
 * Pleasant, professional, clearly audible
 */
export async function playChimeSound(): Promise<boolean> {
  if (!isSoundEnabled()) return false;

  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;

    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.16);

    // Tone 2: A5 (880.00 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.12);
    gain2.gain.setValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);

    return true;
  } catch (err) {
    console.warn('Could not play audio chime:', err);
    return false;
  }
}

export async function testChimeSound(): Promise<boolean> {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    await ctx.resume().catch(() => {});
  }
  return playChimeSound();
}

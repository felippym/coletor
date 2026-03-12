let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

export function playScanSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  } catch {
    // Ignore audio errors
  }
}

export function playScanErrorSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 200;
    oscillator.type = "square";
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.setValueAtTime(1, t + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
    gainNode.gain.setValueAtTime(0, t + 0.1);
    gainNode.gain.setValueAtTime(1, t + 0.15);
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
    oscillator.start(t);
    oscillator.stop(t + 0.25);
  } catch {
    // Ignore audio errors
  }
}

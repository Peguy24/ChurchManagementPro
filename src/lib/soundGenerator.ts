// Sound generator using Web Audio API for varied confirmation tones

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Success sound frequencies - ascending musical notes (major scale feel)
const SUCCESS_FREQUENCIES = [
  [523.25, 659.25], // C5 + E5 (major third - happy)
  [587.33, 739.99], // D5 + F#5 
  [659.25, 830.61], // E5 + G#5
  [698.46, 880.00], // F5 + A5
  [783.99, 987.77], // G5 + B5
  [880.00, 1108.73], // A5 + C#6
];

// Error sound - dissonant
const ERROR_FREQUENCIES = [200, 150];

let successSoundIndex = 0;

export const playSuccessSound = (volume: number = 0.5): void => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Get current frequencies and increment index for next time
    const frequencies = SUCCESS_FREQUENCIES[successSoundIndex % SUCCESS_FREQUENCIES.length];
    successSoundIndex++;
    
    // Create gain node for volume control
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.value = volume * 0.3;
    
    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(masterGain);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = freq;
      
      // Envelope
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(1, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      
      oscillator.start(now + (i * 0.02));
      oscillator.stop(now + 0.35);
    });
    
    // Add a quick "ding" effect
    const ding = ctx.createOscillator();
    const dingGain = ctx.createGain();
    ding.connect(dingGain);
    dingGain.connect(masterGain);
    ding.type = 'sine';
    ding.frequency.value = frequencies[0] * 2;
    dingGain.gain.setValueAtTime(0.5, now);
    dingGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    ding.start(now);
    ding.stop(now + 0.2);
    
  } catch (e) {
    console.error("Error playing success sound:", e);
  }
};

export const playErrorSound = (volume: number = 0.5): void => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.value = volume * 0.3;
    
    // Create buzzer-like error sound
    ERROR_FREQUENCIES.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(masterGain);
      
      oscillator.type = 'square';
      oscillator.frequency.value = freq;
      
      // Short burst envelope
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.8, now + 0.02);
      gainNode.gain.setValueAtTime(0.8, now + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
      
      oscillator.start(now + (i * 0.15));
      oscillator.stop(now + 0.3 + (i * 0.15));
    });
    
  } catch (e) {
    console.error("Error playing error sound:", e);
  }
};

export const playMemberAnnounceSound = (memberIndex: number, volume: number = 0.5): void => {
  // Play a unique tone based on member position in session
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Create ascending tone based on number of successful scans
    const baseFreq = 400 + (memberIndex * 50);
    const cappedFreq = Math.min(baseFreq, 1200);
    
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.value = volume * 0.25;
    
    // Main tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.type = 'sine';
    osc1.frequency.value = cappedFreq;
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(1, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc1.start(now);
    osc1.stop(now + 0.3);
    
    // Harmony (perfect fifth above)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.type = 'sine';
    osc2.frequency.value = cappedFreq * 1.5;
    gain2.gain.setValueAtTime(0, now + 0.02);
    gain2.gain.linearRampToValueAtTime(0.6, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc2.start(now + 0.02);
    osc2.stop(now + 0.25);
    
  } catch (e) {
    console.error("Error playing member sound:", e);
  }
};

export const resetSoundIndex = (): void => {
  successSoundIndex = 0;
};

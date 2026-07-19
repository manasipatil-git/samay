/* ============================================================
   sound.js — synthesizes vintage game audio using Web Audio API
   ============================================================ */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.rainNode = null;
    this.rainGain = null;
    this.unlocked = false;

    // Listen for first interaction to unlock AudioContext (browser policy)
    const unlock = () => {
      this.unlock();
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("click", unlock);
    window.addEventListener("touchstart", unlock);
  }

  unlock() {
    if (this.unlocked) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.unlocked = true;
      this.startRain();
    } catch (e) {
      console.warn("Web Audio API not supported or blocked", e);
    }
  }

  // Generate a buffer of white noise
  _createNoiseBuffer() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  // Synthesize rain ambient sound
  startRain() {
    if (!this.unlocked || !this.ctx) return;
    if (this.rainNode) return;

    try {
      const source = this.ctx.createBufferSource();
      source.buffer = this._createNoiseBuffer();
      source.loop = true;

      // Low pass filter to make it sound like rain outside a window
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 650;

      // High pass filter to reduce rumbling
      const hpFilter = this.ctx.createBiquadFilter();
      hpFilter.type = "highpass";
      hpFilter.frequency.value = 120;

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.value = 0.12; // Subtle ambient level

      // Add a slow LFO to modulate rain intensity slightly (wind waves)
      const lfo = this.ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.15; // 0.15Hz (slow cycle)
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.03;

      lfo.connect(lfoGain);
      lfoGain.connect(this.rainGain.gain);
      lfo.start();

      source.connect(filter);
      filter.connect(hpFilter);
      hpFilter.connect(this.rainGain);
      this.rainGain.connect(this.ctx.destination);

      source.start(0);
      this.rainNode = source;
    } catch (e) {
      console.warn("Failed to start rain synthesis", e);
    }
  }

  // Play a one-shot synthesized sound effect
  play(type) {
    if (!this.unlocked || !this.ctx) return;
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    try {
      const now = this.ctx.currentTime;
      
      if (type === "clack") {
        // Typewriter key clack
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(800 + Math.random() * 400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.03);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } 
      else if (type === "bell") {
        // Typewriter carriage bell
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1560, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.7);
      } 
      else if (type === "paper") {
        // Soft paper rustle
        const source = this.ctx.createBufferSource();
        source.buffer = this._createNoiseBuffer();

        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(3000, now);
        filter.Q.setValueAtTime(1.0, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        source.start(now);
        source.stop(now + 0.2);
      } 
      else if (type === "stamp") {
        // Heavy stamp / wax seal break
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        // Add a bit of low-pass noise for the table vibration
        const source = this.ctx.createBufferSource();
        source.buffer = this._createNoiseBuffer();
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 200;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.2, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        source.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        source.start(now);
        source.stop(now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      }
      else if (type === "pluck") {
        // Corkboard connection established (violin-like pluck)
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Perfect 5th chord: A4 (440Hz) and E5 (659Hz)
        osc1.type = "triangle";
        osc1.frequency.setValueAtTime(440, now);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(659.25, now);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.5);
        osc2.stop(now + 0.5);
      }
    } catch (e) {
      console.warn("SFX synthesis failed", e);
    }
  }
}

// Instantiate globally
window.SAMAY_SOUND = new SoundManager();

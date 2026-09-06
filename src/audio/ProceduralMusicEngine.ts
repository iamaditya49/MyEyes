import { OcularData } from '../types';

export class ProceduralMusicEngine {
  audioContext: AudioContext;
  isPlaying: boolean = false;
  currentVibe: string = 'minimalist ambient drone, quiet';
  targetVibe: string = 'minimalist ambient drone, quiet';
  vibeBlend: number = 1.0;
  nextNoteTime: number = 0;
  timerID: number | null = null;

  // Master nodes for eye modulation
  private masterGain: GainNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private stereoPanner: StereoPannerNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;

  // Meditative drone nodes for closed eyes
  private meditativeGain: GainNode | null = null;
  private meditativeOsc1: OscillatorNode | null = null;
  private meditativeOsc2: OscillatorNode | null = null;

  // Study Mode / Binaural Beats Focus
  public isStudyMode: boolean = false;
  private binauralGain: GainNode | null = null;
  private binauralLeftOsc: OscillatorNode | null = null;
  private binauralRightOsc: OscillatorNode | null = null;
  private binauralLeftPan: StereoPannerNode | null = null;
  private binauralRightPan: StereoPannerNode | null = null;

  // Current ocular values
  private currentOpenness: number = 1.0;
  private currentGazeX: number = 0.0;
  private currentGazeY: number = 0.0;
  private isMeditativeActive: boolean = false;

  // Scales (intervals from root)
  scales: Record<string, number[]> = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    pentatonic: [0, 2, 4, 7, 9],
    cyberpunk: [0, 3, 7, 8, 10],
    drone: [0, 7, 12, 19],
    melancholic: [0, 2, 3, 7, 8],
    dissonant: [0, 1, 6, 7, 11],
    tribal: [0, 3, 5, 7, 10],
    celestial: [0, 4, 7, 11, 14, 18], // for wide-eyed wonder & excitement
    dorian: [0, 2, 3, 5, 7, 9, 10], // for curiosity & inquisitive exploration
    lydian: [0, 2, 4, 6, 7, 9, 11], // for mystical awe & serenity
    wholeTone: [0, 2, 4, 6, 8, 10], // for confusion & skepticism
    pulse: [0, 7, 12, 14], // for determination & analytical focus
    mixolydian: [0, 2, 4, 5, 7, 9, 10] // for playful bounce
  };

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  private initAudioChain() {
    if (this.masterGain) return;

    const ctx = this.audioContext;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.85;

    // Master filter modulated by eye openness
    this.masterFilter = ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 2400;
    this.masterFilter.Q.value = 2.0;

    // Stereo panner modulated by gazeX
    if (ctx.createStereoPanner) {
      this.stereoPanner = ctx.createStereoPanner();
      this.stereoPanner.pan.value = 0;
    }

    // Delay & Reverb space
    this.delayNode = ctx.createDelay();
    this.delayNode.delayTime.value = 0.38;
    this.delayFeedback = ctx.createGain();
    this.delayFeedback.gain.value = 0.45;

    // Routing
    // masterFilter -> stereoPanner (or masterGain) -> destination
    if (this.stereoPanner) {
      this.masterFilter.connect(this.stereoPanner);
      this.stereoPanner.connect(this.masterGain);
    } else {
      this.masterFilter.connect(this.masterGain);
    }

    // Reverb loop
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.masterFilter);

    this.masterGain.connect(ctx.destination);

    // Setup meditative warm drone generator for closed-eye state
    this.meditativeGain = ctx.createGain();
    this.meditativeGain.gain.value = 0;
    this.meditativeGain.connect(this.masterFilter);

    this.meditativeOsc1 = ctx.createOscillator();
    this.meditativeOsc1.type = 'sine';
    this.meditativeOsc1.frequency.value = 110; // A2
    this.meditativeOsc1.start();
    this.meditativeOsc1.connect(this.meditativeGain);

    this.meditativeOsc2 = ctx.createOscillator();
    this.meditativeOsc2.type = 'triangle';
    this.meditativeOsc2.frequency.value = 164.81; // E3 (fifth)
    this.meditativeOsc2.start();
    this.meditativeOsc2.connect(this.meditativeGain);

    // Setup Binaural Beats for Focus Mode (14Hz Beta waves for concentration)
    this.binauralGain = ctx.createGain();
    this.binauralGain.gain.value = 0; // Muted by default
    this.binauralGain.connect(ctx.destination); // Bypass master filter to keep beats clean

    if (ctx.createStereoPanner) {
      this.binauralLeftPan = ctx.createStereoPanner();
      this.binauralLeftPan.pan.value = -1;
      this.binauralLeftPan.connect(this.binauralGain);

      this.binauralRightPan = ctx.createStereoPanner();
      this.binauralRightPan.pan.value = 1;
      this.binauralRightPan.connect(this.binauralGain);
    }

    this.binauralLeftOsc = ctx.createOscillator();
    this.binauralLeftOsc.type = 'sine';
    this.binauralLeftOsc.frequency.value = 200; // 200Hz left ear
    this.binauralLeftOsc.start();
    this.binauralLeftOsc.connect(this.binauralLeftPan || this.binauralGain);

    this.binauralRightOsc = ctx.createOscillator();
    this.binauralRightOsc.type = 'sine';
    this.binauralRightOsc.frequency.value = 214; // 214Hz right ear -> 14Hz beat
    this.binauralRightOsc.start();
    this.binauralRightOsc.connect(this.binauralRightPan || this.binauralGain);
  }

  setStudyMode(active: boolean) {
    this.isStudyMode = active;
    if (!this.binauralGain || !this.masterGain) return;
    const now = this.audioContext.currentTime;

    if (active) {
      // Fade OUT noisy background / general procedural music
      this.masterGain.gain.setTargetAtTime(0.05, now, 1.0); // Keep very quiet
      // Fade IN clean binaural focus beats
      this.binauralGain.gain.setTargetAtTime(0.7, now, 1.0);
    } else {
      // Restore normal music
      this.masterGain.gain.setTargetAtTime(0.85, now, 1.0);
      // Fade OUT binaural beats
      this.binauralGain.gain.setTargetAtTime(0, now, 1.0);
    }
  }

  setVibe(vibe: string) {
    if (this.targetVibe !== vibe) {
      if (this.vibeBlend >= 1.0) {
        this.currentVibe = this.targetVibe;
      }
      this.targetVibe = vibe;
      this.vibeBlend = 0.0;
    }
  }

  /**
   * Real-time continuous modulation of the soundscape via Ocular state
   */
  updateOcularState(ocular: OcularData) {
    if (!this.isPlaying || this.audioContext.state === 'closed') return;
    this.initAudioChain();

    const now = this.audioContext.currentTime;
    this.currentOpenness = ocular.averageOpenness;
    this.currentGazeX = ocular.gazeX;
    this.currentGazeY = ocular.gazeY;

    // 1. Modulate Master Filter Frequency based on Eye Openness:
    // Closed eyes = warm lowpass (300Hz - 600Hz)
    // Wide eyes = bright open sparkling filter (3500Hz - 7000Hz)
    if (this.masterFilter) {
      let targetFreq = 400 + Math.pow(ocular.averageOpenness, 1.8) * 3200;
      if (ocular.wide > 0.2) {
        targetFreq += ocular.wide * 2500;
      }
      if (ocular.squint > 0.3) {
        targetFreq = Math.max(350, targetFreq - ocular.squint * 1000);
      }
      this.masterFilter.frequency.setTargetAtTime(targetFreq, now, 0.12);
    }

    // 2. Modulate Stereo Panning based on horizontal gaze:
    if (this.stereoPanner) {
      const targetPan = Math.max(-0.85, Math.min(0.85, ocular.gazeX * 0.9));
      this.stereoPanner.pan.setTargetAtTime(targetPan, now, 0.1);
    }

    // 3. Meditative Drone for Closed Eyes:
    if (this.meditativeGain) {
      if (ocular.isClosed) {
        if (!this.isMeditativeActive) {
          this.isMeditativeActive = true;
          this.meditativeGain.gain.setTargetAtTime(0.22, now, 1.2);
        }
      } else {
        if (this.isMeditativeActive) {
          this.isMeditativeActive = false;
          this.meditativeGain.gain.setTargetAtTime(0.0, now, 0.5);
        }
      }
    }
  }

  /**
   * Generates a crystalline drop chime when the user blinks
   */
  triggerBlinkChime() {
    if (!this.isPlaying || this.audioContext.state !== 'running') return;
    this.initAudioChain();

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    // High crystalline note modulated by gazeY
    const baseFreq = 880; // A5
    const pitchOffset = Math.round(this.currentGazeY * 4) * 50;
    const freq = baseFreq + pitchOffset;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.08);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(gain);
    if (this.masterFilter) {
      gain.connect(this.masterFilter);
    } else {
      gain.connect(this.audioContext.destination);
    }

    if (this.delayNode) {
      gain.connect(this.delayNode);
    }

    osc.start(now);
    osc.stop(now + 0.45);
  }

  /**
   * Generates a playful musical flourish when user winks
   */
  triggerWinkFlourish(side: 'left' | 'right') {
    if (!this.isPlaying || this.audioContext.state !== 'running') return;
    this.initAudioChain();

    const now = this.audioContext.currentTime;
    const freqs = side === 'left' ? [523.25, 659.25, 783.99] : [783.99, 659.25, 523.25];

    freqs.forEach((f, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const noteTime = now + i * 0.09;

      osc.type = 'triangle';
      osc.frequency.value = f;

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.07, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      if (this.masterFilter) {
        gain.connect(this.masterFilter);
      } else {
        gain.connect(this.audioContext.destination);
      }

      osc.start(noteTime);
      osc.stop(noteTime + 0.4);
    });
  }

  start() {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    this.initAudioChain();
    this.isPlaying = true;
    this.nextNoteTime = this.audioContext.currentTime + 0.1;
    this.scheduleNext();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerID !== null) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
    if (this.audioContext.state !== 'closed') {
      try {
        this.audioContext.suspend();
      } catch (e) {}
    }
  }

  playNote(freq: number, type: OscillatorType, duration: number, vol: number, attack: number, time: number) {
    if (this.audioContext.state === 'closed' || !this.masterFilter) return;

    const numOscs = 3;
    const noteGain = this.audioContext.createGain();
    noteGain.connect(this.masterFilter);
    if (this.delayNode) {
      noteGain.connect(this.delayNode);
    }

    const now = time;
    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(vol, now + attack);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    for (let i = 0; i < numOscs; i++) {
      const osc = this.audioContext.createOscillator();
      const filter = this.audioContext.createBiquadFilter();

      osc.type = i === 0 ? type : 'sine';
      osc.frequency.value = freq * (1 + (i * 0.006));

      filter.type = 'lowpass';
      filter.frequency.value = freq * 3;
      filter.frequency.linearRampToValueAtTime(freq * 5, now + attack);
      filter.frequency.linearRampToValueAtTime(freq * 1.5, now + duration);

      osc.connect(filter);
      filter.connect(noteGain);

      osc.start(now);
      osc.stop(now + duration);
    }
  }

  getTempoForVibe(vibe: string): number {
    const v = vibe.toLowerCase();
    if (v.includes('excited') || v.includes('elation') || v.includes('fast tempo')) return 110;
    if (v.includes('tribal') || v.includes('playful') || v.includes('rhythmic')) return 92;
    if (v.includes('cyberpunk') || v.includes('electronic') || v.includes('focus')) return 75;
    if (v.includes('curious') || v.includes('inquisitive') || v.includes('jazz')) return 62;
    if (v.includes('awe') || v.includes('wonder') || v.includes('surprise')) return 50;
    if (v.includes('confusion') || v.includes('skeptical') || v.includes('sad')) return 40;
    if (v.includes('serene') || v.includes('calm') || v.includes('bored') || v.includes('meditative')) return 30;
    return 44;
  }

  scheduleNext() {
    if (!this.isPlaying) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    while (this.nextNoteTime < this.audioContext.currentTime + 0.5) {
      if (this.vibeBlend < 1.0) {
        this.vibeBlend += 0.02;
        if (this.vibeBlend > 1.0) this.vibeBlend = 1.0;
      }

      if (this.vibeBlend < 1.0) {
        const currentWeight = Math.cos(this.vibeBlend * 0.5 * Math.PI);
        const targetWeight = Math.sin(this.vibeBlend * 0.5 * Math.PI);
        this.generateTickForVibe(this.currentVibe, currentWeight, this.nextNoteTime);
        this.generateTickForVibe(this.targetVibe, targetWeight, this.nextNoteTime);
      } else {
        this.generateTickForVibe(this.targetVibe, 1.0, this.nextNoteTime);
      }

      const currentTempo = this.getTempoForVibe(this.currentVibe);
      const targetTempo = this.getTempoForVibe(this.targetVibe);
      let tempo = currentTempo * (1 - this.vibeBlend) + targetTempo * this.vibeBlend;

      // Closed eyes slows down tempo into meditative relaxation
      if (this.currentOpenness < 0.4) {
        tempo *= 0.75;
      }

      const secondsPerBeat = 60.0 / Math.max(25, tempo);
      this.nextNoteTime += secondsPerBeat;
    }

    this.timerID = window.setTimeout(() => this.scheduleNext(), 60);
  }

  generateTickForVibe(vibe: string, weight: number, time: number) {
    if (weight <= 0.01) return;

    const v = vibe.toLowerCase();
    const isCyberpunk = v.includes('cyberpunk') || v.includes('electronic');
    const isExcited = v.includes('excited') || v.includes('elation');
    const isPlayful = v.includes('playful') || v.includes('cheeky') || v.includes('whimsical');
    const isAwe = v.includes('awe') || v.includes('wonder') || v.includes('celestial');
    const isCurious = v.includes('curious') || v.includes('inquisitive');
    const isFocus = v.includes('focus') || v.includes('determination');
    const isConfusedOrSkeptical = v.includes('confus') || v.includes('skeptic');
    const isSerene = v.includes('seren') || v.includes('calm') || v.includes('meditative');
    const isTribal = v.includes('tribal') || v.includes('rhythmic') || v.includes('joy') || v.includes('happy');
    const isAcoustic = v.includes('acoustic') || v.includes('guitar');
    const isAmbient = v.includes('ambient') || v.includes('drone');
    const isSad = v.includes('sad') || v.includes('melanchol');
    const isTense = v.includes('angry') || v.includes('fear') || v.includes('disgust') || v.includes('frustrat');
    const isBored = v.includes('bored') || v.includes('fatigue');

    let scale = this.scales.pentatonic;
    let baseNote = 48; // C3
    let oscType: OscillatorType = 'sine';
    let vol = 0.09;
    let duration = 5.5;
    let attack = 2.5;

    if (isExcited) {
      scale = this.scales.celestial;
      baseNote = 60; // C4 higher register
      oscType = 'triangle';
      vol = 0.08;
      duration = 2.8;
      attack = 0.4;
    } else if (isPlayful) {
      scale = this.scales.mixolydian;
      baseNote = 53; // F3
      oscType = 'triangle';
      vol = 0.08;
      duration = 2.0;
      attack = 0.15;
    } else if (isAwe) {
      scale = this.scales.lydian;
      baseNote = 48;
      oscType = 'sine';
      vol = 0.11;
      duration = 8.0;
      attack = 3.0;
    } else if (isCurious) {
      scale = this.scales.dorian;
      baseNote = 50;
      oscType = 'sine';
      vol = 0.08;
      duration = 3.5;
      attack = 0.8;
    } else if (isFocus) {
      scale = this.scales.pulse;
      baseNote = 41; // F2
      oscType = 'triangle';
      vol = 0.07;
      duration = 2.2;
      attack = 0.1;
    } else if (isConfusedOrSkeptical) {
      scale = this.scales.wholeTone;
      baseNote = 46;
      oscType = 'sine';
      vol = 0.07;
      duration = 4.2;
      attack = 1.2;
    } else if (isSerene) {
      scale = this.scales.drone;
      baseNote = 36; // C2
      oscType = 'sine';
      vol = 0.12;
      duration = 9.5;
      attack = 4.5;
    } else if (isBored) {
      scale = this.scales.drone;
      baseNote = 31; // G1 low hum
      oscType = 'sine';
      vol = 0.06;
      duration = 8.0;
      attack = 4.0;
    } else if (isCyberpunk) {
      scale = this.scales.cyberpunk;
      baseNote = 36;
      oscType = 'sawtooth';
      vol = 0.05;
      duration = 4.0;
      attack = 1.5;
    } else if (isTribal) {
      scale = this.scales.tribal;
      baseNote = 43;
      oscType = 'triangle';
      vol = 0.07;
      duration = 1.6;
      attack = 0.1;
    } else if (isSad) {
      scale = this.scales.melancholic;
      baseNote = 48;
      oscType = 'sine';
      vol = 0.08;
      duration = 7.0;
      attack = 3.5;
    } else if (isTense) {
      scale = this.scales.dissonant;
      baseNote = 36;
      oscType = 'sawtooth';
      vol = 0.05;
      duration = 4.5;
      attack = 1.2;
    } else if (isAcoustic) {
      scale = this.scales.major;
      baseNote = 48;
      oscType = 'triangle';
      vol = 0.08;
      duration = 4.5;
      attack = 1.5;
    } else if (isAmbient) {
      scale = this.scales.drone;
      baseNote = 36;
      oscType = 'sine';
      vol = 0.12;
      duration = 9.0;
      attack = 4.0;
    }

    // Vertical Gaze modulation: looking up transposes up an octave, looking down transposes down
    if (this.currentGazeY > 0.3) {
      baseNote += 12;
    } else if (this.currentGazeY < -0.3) {
      baseNote -= 12;
    }

    vol *= weight;

    if (Math.random() > 0.25) {
      const noteIndex = scale[Math.floor(Math.random() * scale.length)];
      const freq = 440 * Math.pow(2, (baseNote + noteIndex - 69) / 12);
      this.playNote(freq, oscType, duration, vol, attack, time);
    }

    // Occasional bass drone
    if (Math.random() > 0.45) {
      const bassFreq = 440 * Math.pow(2, (baseNote - 12 - 69) / 12);
      this.playNote(bassFreq, 'sine', duration * 1.8, vol * 1.4, attack * 1.5, time);
    }
  }
}

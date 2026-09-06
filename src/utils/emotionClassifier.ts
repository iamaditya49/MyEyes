import { OcularData } from '../types';

export interface EmotionMetric {
  id: string;
  name: string;
  label: string;
  score: number; // 0.0 to 1.0 (calibrated & smoothed)
  rawScore: number;
  valence: 'positive' | 'negative' | 'neutral' | 'complex';
  arousal: 'high' | 'medium' | 'low';
  emoji: string;
  description: string;
  category: 'joy' | 'calm' | 'cognitive' | 'reactive' | 'tension' | 'fatigue';
  facsActionUnits: string; // Action Units in Facial Action Coding System
  color: string; // Accent color for UI
}

export interface EmotionClassificationResult {
  primary: EmotionMetric;
  secondary: EmotionMetric | null;
  emotions: EmotionMetric[]; // sorted by score descending
  valenceScore: number; // -1.0 (negative) to +1.0 (positive)
  arousalScore: number; // 0.0 (low arousal/sleepy) to 1.0 (high arousal/excited)
  expressiveness: number; // overall facial activation level (0.0 to 1.0)
}

export interface RawBlendshapeCategory {
  categoryName: string;
  score: number;
}

// Full catalogue of human emotions detectable through MediaPipe 52 ARKit Blendshapes & Ocular Tracking
export const EMOTION_DEFINITIONS: Omit<EmotionMetric, 'score' | 'rawScore'>[] = [
  {
    id: 'joy',
    name: 'Joy & Happiness',
    label: 'Joyful',
    valence: 'positive',
    arousal: 'medium',
    emoji: '😊',
    description: 'Warm authentic happiness with upturned lip corners and crinkled cheek raisers.',
    category: 'joy',
    facsActionUnits: 'AU6 (Cheek Raiser) + AU12 (Lip Corner Puller)',
    color: '#4ade80', // green-400
  },
  {
    id: 'excitement',
    name: 'Excitement & Elation',
    label: 'Excited',
    valence: 'positive',
    arousal: 'high',
    emoji: '🤩',
    description: 'High-energy radiant joy with wide open sparkling eyes and expressive grin.',
    category: 'joy',
    facsActionUnits: 'AU5 (Eye Wide) + AU12 (Smile) + AU26 (Jaw Open)',
    color: '#22d3ee', // cyan-400
  },
  {
    id: 'serenity',
    name: 'Serenity & Calm',
    label: 'Serene',
    valence: 'positive',
    arousal: 'low',
    emoji: '😌',
    description: 'Deep peaceful composure, smooth facial features, and tranquil relaxed eyelids.',
    category: 'calm',
    facsActionUnits: 'AU43 (Eyes Soft/Closed) + Low Facial Tension',
    color: '#818cf8', // indigo-400
  },
  {
    id: 'awe',
    name: 'Awe & Wonder',
    label: 'Awe-Inspired',
    valence: 'positive',
    arousal: 'medium',
    emoji: '✨',
    description: 'Expansive wide-eyed reverence, upward contemplative gaze, and slightly parted lips.',
    category: 'reactive',
    facsActionUnits: 'AU1 (Inner Brow Up) + AU5 (Eye Wide) + AU26 (Mouth Part)',
    color: '#38bdf8', // sky-400
  },
  {
    id: 'playfulness',
    name: 'Playfulness & Cheekiness',
    label: 'Playful',
    valence: 'positive',
    arousal: 'medium',
    emoji: '😜',
    description: 'Whimsical mischievous energy characterized by winks, playful smirks, or cheek puffs.',
    category: 'joy',
    facsActionUnits: 'AU46 (Wink) / AU33 (Cheek Puff) / AU19 (Tongue/Smirk)',
    color: '#facc15', // amber-400
  },
  {
    id: 'curiosity',
    name: 'Curiosity & Interest',
    label: 'Curious',
    valence: 'positive',
    arousal: 'medium',
    emoji: '🧐',
    description: 'Engaged inquisitive alertness with slightly raised inner brows and active gaze scanning.',
    category: 'cognitive',
    facsActionUnits: 'AU1 (Inner Brow Up) + Active Ocular Saccades',
    color: '#a78bfa', // violet-400
  },
  {
    id: 'focus',
    name: 'Determination & Focus',
    label: 'Focused',
    valence: 'neutral',
    arousal: 'medium',
    emoji: '🎯',
    description: 'Analytical concentration with direct ocular lock, tightened eyelids, and firm lips.',
    category: 'cognitive',
    facsActionUnits: 'AU7 (Lid Tightener) + AU24 (Lip Pressor) + Direct Gaze',
    color: '#f43f5e', // rose-500
  },
  {
    id: 'surprise',
    name: 'Surprise & Astonishment',
    label: 'Surprised',
    valence: 'neutral',
    arousal: 'high',
    emoji: '😲',
    description: 'Immediate spontaneous shock with arched brows, wide circular eyes, and dropped jaw.',
    category: 'reactive',
    facsActionUnits: 'AU1+2 (Brow Raiser) + AU5 (Eye Wide) + AU27 (Mouth Stretch)',
    color: '#fb923c', // orange-400
  },
  {
    id: 'confusion',
    name: 'Confusion & Puzzlement',
    label: 'Confused',
    valence: 'neutral',
    arousal: 'medium',
    emoji: '🤔',
    description: 'Cognitive perplexity with furrowed brows, squinted eyes, and asymmetric mouth pucker.',
    category: 'cognitive',
    facsActionUnits: 'AU4 (Brow Lowerer) + AU7 (Squint) + AU18 (Lip Pucker)',
    color: '#e879f9', // fuchsia-400
  },
  {
    id: 'skepticism',
    name: 'Skepticism & Doubt',
    label: 'Skeptical',
    valence: 'neutral',
    arousal: 'medium',
    emoji: '🤨',
    description: 'Critical scrutinizing doubt with an asymmetric raised eyebrow and narrowed gaze.',
    category: 'cognitive',
    facsActionUnits: 'AU2 (Unilateral Brow Up) + AU7 (Squint) + AU14 (Dimple)',
    color: '#f59e0b', // amber-500
  },
  {
    id: 'sadness',
    name: 'Sadness & Melancholy',
    label: 'Melancholic',
    valence: 'negative',
    arousal: 'low',
    emoji: '😢',
    description: 'Sorrowful longing with upturned inner eyebrows, downward pulled lip corners, and dropped chin.',
    category: 'tension',
    facsActionUnits: 'AU1 (Inner Brow Up) + AU4 (Brow Furrow) + AU15 (Lip Corner Depressor)',
    color: '#60a5fa', // blue-400
  },
  {
    id: 'anger',
    name: 'Anger & Frustration',
    label: 'Frustrated',
    valence: 'negative',
    arousal: 'high',
    emoji: '😠',
    description: 'Intense displeasure marked by lowered drawn-together eyebrows, pressed lips, and narrowed stare.',
    category: 'tension',
    facsActionUnits: 'AU4 (Brow Lowerer) + AU23/24 (Lip Tightener/Pressor)',
    color: '#ef4444', // red-500
  },
  {
    id: 'fear',
    name: 'Fear & Apprehension',
    label: 'Apprehensive',
    valence: 'negative',
    arousal: 'high',
    emoji: '😨',
    description: 'High-alert alarm with elevated tense eyebrows, widened sclera, and horizontally retracted lips.',
    category: 'tension',
    facsActionUnits: 'AU1+2+4 (Fear Brow) + AU5 (Eye Wide) + AU20 (Lip Stretcher)',
    color: '#c084fc', // purple-400
  },
  {
    id: 'disgust',
    name: 'Disgust & Aversion',
    label: 'Averse',
    valence: 'negative',
    arousal: 'medium',
    emoji: '😣',
    description: 'Visceral revulsion with crinkled nose sneer and elevated curled upper lip.',
    category: 'tension',
    facsActionUnits: 'AU9 (Nose Wrinkler) + AU10 (Upper Lip Raiser)',
    color: '#a3e635', // lime-400
  },
  {
    id: 'contempt',
    name: 'Contempt & Disdain',
    label: 'Disdainful',
    valence: 'negative',
    arousal: 'low',
    emoji: '😏',
    description: 'Unilateral sneer or asymmetrical dimpled smirk with slight head tilt and condescending gaze.',
    category: 'tension',
    facsActionUnits: 'AU14 (Unilateral Dimpler) / Asymmetric AU12',
    color: '#fb7185', // rose-400
  },
  {
    id: 'embarrassment',
    name: 'Embarrassment & Shyness',
    label: 'Bashful',
    valence: 'complex',
    arousal: 'medium',
    emoji: '😳',
    description: 'Self-conscious bashfulness with downward averted gaze, suppressed smile, and compressed lips.',
    category: 'reactive',
    facsActionUnits: 'AU12 (Suppressed Smile) + AU24 (Lip Press) + AU64 (Downward Gaze)',
    color: '#f472b6', // pink-400
  },
  {
    id: 'boredom',
    name: 'Boredom & Fatigue',
    label: 'Fatigued',
    valence: 'negative',
    arousal: 'low',
    emoji: '🥱',
    description: 'Low mental engagement, heavy drooping eyelids, sluggish blinks, and slack facial posture.',
    category: 'fatigue',
    facsActionUnits: 'AU41 (Drooping Eyelids) + AU26 (Slack Jaw) + Low Blink Rate',
    color: '#94a3b8', // slate-400
  },
  {
    id: 'neutral',
    name: 'Neutral & Composure',
    label: 'Composed',
    valence: 'neutral',
    arousal: 'low',
    emoji: '😐',
    description: 'Balanced baseline state without prominent emotional muscle contraction.',
    category: 'calm',
    facsActionUnits: 'Equilibrium (All AUs resting at baseline)',
    color: '#e2e8f0', // slate-200
  },
];

export class EmotionClassifier {
  private smoothedScores: Map<string, number> = new Map();
  private smoothingAlpha = 0.22; // Adaptive exponential moving average

  constructor() {
    EMOTION_DEFINITIONS.forEach((def) => {
      this.smoothedScores.set(def.id, def.id === 'neutral' ? 0.35 : 0.0);
    });
  }

  /**
   * Reset internal smoothing buffers
   */
  reset() {
    EMOTION_DEFINITIONS.forEach((def) => {
      this.smoothedScores.set(def.id, def.id === 'neutral' ? 0.35 : 0.0);
    });
  }

  /**
   * Classify raw blendshape scores and ocular data into all 18 human emotional dimensions
   */
  classify(
    blendshapes: RawBlendshapeCategory[] | undefined,
    ocular: OcularData
  ): EmotionClassificationResult {
    // Helper to extract score from raw blendshape categories
    const get = (name: string): number => {
      if (!blendshapes) return 0;
      const found = blendshapes.find((b) => b.categoryName === name);
      return found ? found.score : 0;
    };

    // Primary Facial Muscle Activations (FACS Action Units)
    const smileL = get('mouthSmileLeft');
    const smileR = get('mouthSmileRight');
    const avgSmile = (smileL + smileR) / 2;
    const smileDelta = Math.abs(smileL - smileR);

    const frownL = get('mouthFrownLeft');
    const frownR = get('mouthFrownRight');
    const avgFrown = (frownL + frownR) / 2;

    const browDownL = get('browDownLeft');
    const browDownR = get('browDownRight');
    const avgBrowDown = (browDownL + browDownR) / 2;

    const browOuterUpL = get('browOuterUpLeft');
    const browOuterUpR = get('browOuterUpRight');
    const avgBrowOuterUp = (browOuterUpL + browOuterUpR) / 2;
    const browAsymmetry = Math.abs(browOuterUpL - browOuterUpR);

    const browInnerUp = get('browInnerUp');
    const jawOpen = get('jawOpen');
    const mouthPressL = get('mouthPressLeft');
    const mouthPressR = get('mouthPressRight');
    const avgMouthPress = (mouthPressL + mouthPressR) / 2;

    const mouthPucker = get('mouthPucker');
    const mouthFunnel = get('mouthFunnel');
    const mouthRollLower = get('mouthRollLower');
    const mouthShrugLower = get('mouthShrugLower');
    const mouthStretchL = get('mouthStretchLeft');
    const mouthStretchR = get('mouthStretchRight');
    const avgMouthStretch = (mouthStretchL + mouthStretchR) / 2;

    const noseSneerL = get('noseSneerLeft');
    const noseSneerR = get('noseSneerRight');
    const avgNoseSneer = (noseSneerL + noseSneerR) / 2;

    const mouthUpperUpL = get('mouthUpperUpLeft');
    const mouthUpperUpR = get('mouthUpperUpRight');
    const avgMouthUpperUp = (mouthUpperUpL + mouthUpperUpR) / 2;

    const cheekSquintL = get('cheekSquintLeft');
    const cheekSquintR = get('cheekSquintRight');
    const avgCheekSquint = (cheekSquintL + cheekSquintR) / 2;

    const cheekPuff = get('cheekPuff');
    const dimpleL = get('mouthDimpleLeft');
    const dimpleR = get('mouthDimpleRight');
    const avgDimple = (dimpleL + dimpleR) / 2;
    const dimpleDelta = Math.abs(dimpleL - dimpleR);

    const eyeSquintL = get('eyeSquintLeft');
    const eyeSquintR = get('eyeSquintRight');
    const avgEyeSquint = (eyeSquintL + eyeSquintR) / 2;

    const eyeWideL = get('eyeWideLeft');
    const eyeWideR = get('eyeWideRight');
    const avgEyeWide = Math.max((eyeWideL + eyeWideR) / 2, ocular.wide);

    const isWinking = ocular.isWinkingLeft || ocular.isWinkingRight;
    const isClosed = ocular.isClosed;
    const openness = ocular.averageOpenness;
    const gazeX = ocular.gazeX;
    const gazeY = ocular.gazeY;

    // --- Mathematical formulation of each emotion based on FACS & Affective Science ---

    // 1. Joy & Happiness (Duchenne smile: smile + cheek squint + relaxed brows)
    const rawJoy = Math.min(
      1.0,
      avgSmile * 1.35 + avgCheekSquint * 0.45 - avgBrowDown * 0.35 - avgFrown * 0.5
    );

    // 2. Excitement & Elation (Wide eyes + broad smile + raised outer brows + mouth open)
    const rawExcitement = Math.min(
      1.0,
      avgSmile * 0.7 + avgEyeWide * 0.8 + avgBrowOuterUp * 0.5 + jawOpen * 0.4 - avgFrown * 0.5
    );

    // 3. Serenity & Calm (Eyes closed or relaxed soft gaze + zero brow furrow + smooth mouth)
    let rawSerenity = 0;
    if (isClosed) {
      rawSerenity = 0.85 + (1 - Math.min(1, avgBrowDown + avgMouthPress)) * 0.15;
    } else if (openness < 0.65 && avgSmile < 0.25 && avgFrown < 0.2 && avgBrowDown < 0.2) {
      rawSerenity = 0.45 + (1 - openness) * 0.3;
    }

    // 4. Awe & Wonder (Wide eyes + upward gaze + parted mouth + raised inner brows)
    const upwardGazeFactor = Math.max(0, gazeY * 1.2);
    const rawAwe = Math.min(
      1.0,
      avgEyeWide * 1.1 + browInnerUp * 0.6 + jawOpen * 0.4 + upwardGazeFactor * 0.35 - avgBrowDown * 0.4
    );

    // 5. Playfulness & Cheekiness (Winks, tongue out, cheek puff, or cheeky asymmetrical smile)
    let rawPlayful = 0;
    if (isWinking) {
      rawPlayful = 0.85 + avgSmile * 0.2;
    } else {
      rawPlayful = Math.min(
        1.0,
        cheekPuff * 1.2 + (smileDelta > 0.18 ? smileDelta * 1.5 : 0) + avgSmile * 0.4
      );
    }

    // 6. Curiosity & Interest (Raised inner brows + head movement / gaze exploration + mild squint)
    const activeGazeMovement = Math.min(1.0, Math.abs(gazeX) * 0.7 + Math.abs(gazeY) * 0.5);
    const rawCuriosity = Math.min(
      1.0,
      browInnerUp * 0.65 + avgEyeSquint * 0.3 + activeGazeMovement * 0.4 - avgBrowDown * 0.35
    );

    // 7. Determination & Focus (Direct ocular lock + squint focus + pressed lips + slight brow tension without anger)
    const directGazeFactor = ocular.gazeDirection === 'DIRECT FOCUS' ? 0.35 : 0;
    const rawFocus = Math.min(
      1.0,
      avgEyeSquint * 0.8 + avgMouthPress * 0.5 + avgBrowDown * 0.35 + directGazeFactor - avgSmile * 0.35
    );

    // 8. Surprise & Astonishment (Raised inner+outer brows + wide eyes + jaw drop)
    const rawSurprise = Math.min(
      1.0,
      (browInnerUp + avgBrowOuterUp) * 0.65 + avgEyeWide * 0.7 + jawOpen * 0.75 - avgSmile * 0.2
    );

    // 9. Confusion & Puzzlement (Brow furrow + squint + mouth pucker or funnel)
    const rawConfusion = Math.min(
      1.0,
      avgBrowDown * 0.75 + avgEyeSquint * 0.5 + (mouthPucker + mouthFunnel) * 0.65 - avgSmile * 0.4
    );

    // 10. Skepticism & Doubt (Asymmetrical brow raise + squint + unilateral dimple/press)
    const rawSkepticism = Math.min(
      1.0,
      browAsymmetry * 2.2 + avgEyeSquint * 0.5 + (dimpleDelta > 0.12 ? dimpleDelta * 1.4 : 0) + avgMouthPress * 0.3
    );

    // 11. Sadness & Melancholy (Inner brow raise + lip corner depression + lower lip shrug)
    const rawSadness = Math.min(
      1.0,
      browInnerUp * 0.65 + avgFrown * 1.4 + mouthRollLower * 0.5 + mouthShrugLower * 0.6 - avgSmile * 0.6
    );

    // 12. Anger & Frustration (Corrugator brow furrow down + lip press/tightener + nose sneer)
    const rawAnger = Math.min(
      1.0,
      avgBrowDown * 1.25 + avgMouthPress * 0.7 + avgNoseSneer * 0.5 + avgEyeSquint * 0.3 - avgSmile * 0.6
    );

    // 13. Fear & Apprehension (Raised and drawn-together brows + wide eyes + mouth stretch)
    const fearBrow = (browInnerUp + avgBrowDown) * 0.55;
    const rawFear = Math.min(
      1.0,
      fearBrow * 0.8 + avgEyeWide * 0.75 + avgMouthStretch * 0.85 + jawOpen * 0.3
    );

    // 14. Disgust & Aversion (Nose sneer + upper lip levator + squinted eyes)
    const rawDisgust = Math.min(
      1.0,
      avgNoseSneer * 1.6 + avgMouthUpperUp * 1.2 + avgEyeSquint * 0.35 - avgSmile * 0.5
    );

    // 15. Contempt & Disdain (Unilateral dimple / asymmetrical smirk + head tilt)
    const unilateralSmirk = smileDelta > 0.2 ? smileDelta * 1.5 : 0;
    const unilateralDimple = dimpleDelta > 0.15 ? dimpleDelta * 1.6 : 0;
    const rawContempt = Math.min(
      1.0,
      unilateralSmirk * 0.65 + unilateralDimple * 0.75 + avgDimple * 0.3 - avgSmile * 0.3
    );

    // 16. Embarrassment & Shyness (Suppressed smile + pressed lips + downward averted gaze)
    const downwardGaze = Math.max(0, -gazeY * 1.2);
    const avertedGaze = Math.abs(gazeX) * 0.7;
    const rawEmbarrassment = Math.min(
      1.0,
      (downwardGaze + avertedGaze) * 0.45 + (avgSmile > 0.15 && avgMouthPress > 0.15 ? 0.7 : 0) + mouthRollLower * 0.4
    );

    // 17. Boredom & Fatigue (Heavy drooping eyes + downward slack gaze + slack jaw, no smile/frown)
    let rawBoredom = 0;
    if (!isClosed && openness < 0.48 && avgSmile < 0.15 && avgFrown < 0.15) {
      rawBoredom = Math.min(
        1.0,
        (0.55 - openness) * 1.8 + downwardGaze * 0.4 + jawOpen * 0.3
      );
    }

    // Map of raw calculated scores
    const rawScoresMap: Record<string, number> = {
      joy: Math.max(0, rawJoy),
      excitement: Math.max(0, rawExcitement),
      serenity: Math.max(0, rawSerenity),
      awe: Math.max(0, rawAwe),
      playfulness: Math.max(0, rawPlayful),
      curiosity: Math.max(0, rawCuriosity),
      focus: Math.max(0, rawFocus),
      surprise: Math.max(0, rawSurprise),
      confusion: Math.max(0, rawConfusion),
      skepticism: Math.max(0, rawSkepticism),
      sadness: Math.max(0, rawSadness),
      anger: Math.max(0, rawAnger),
      fear: Math.max(0, rawFear),
      disgust: Math.max(0, rawDisgust),
      contempt: Math.max(0, rawContempt),
      embarrassment: Math.max(0, rawEmbarrassment),
      boredom: Math.max(0, rawBoredom),
    };

    // Calculate maximum non-neutral emotional activation
    let maxNonNeutral = 0;
    Object.values(rawScoresMap).forEach((s) => {
      if (s > maxNonNeutral) maxNonNeutral = s;
    });

    // 18. Neutral & Composure (Highest when all other emotional activations are subdued)
    const rawNeutral = Math.max(0, Math.min(1.0, 1.0 - maxNonNeutral * 1.4));
    rawScoresMap.neutral = rawNeutral;

    // Apply temporal smoothing (Exponential Moving Average) to avoid jerky flickering
    const smoothedList: EmotionMetric[] = EMOTION_DEFINITIONS.map((def) => {
      const raw = rawScoresMap[def.id] || 0;
      const prev = this.smoothedScores.get(def.id) ?? (def.id === 'neutral' ? 0.35 : 0);

      // Fast attack, smooth decay
      const alpha = raw > prev ? this.smoothingAlpha * 1.3 : this.smoothingAlpha * 0.8;
      const smoothed = prev + (raw - prev) * alpha;
      this.smoothedScores.set(def.id, smoothed);

      return {
        ...def,
        rawScore: Math.round(raw * 100) / 100,
        score: Math.round(Math.max(0, Math.min(1, smoothed)) * 100) / 100,
      };
    });

    // Sort descending by score
    smoothedList.sort((a, b) => b.score - a.score);

    const primary = smoothedList[0];
    const secondary =
      smoothedList.length > 1 && smoothedList[1].score > 0.18 && smoothedList[1].id !== primary.id
        ? smoothedList[1]
        : null;

    // Compute Circumplex Dimensional Affect (Valence & Arousal)
    // Valence: -1.0 (unpleasant) to +1.0 (pleasant)
    // Arousal: 0.0 (calm) to 1.0 (highly activated)
    const positiveMass =
      (rawScoresMap.joy || 0) * 1.0 +
      (rawScoresMap.excitement || 0) * 1.0 +
      (rawScoresMap.serenity || 0) * 0.75 +
      (rawScoresMap.awe || 0) * 0.8 +
      (rawScoresMap.playfulness || 0) * 0.9 +
      (rawScoresMap.curiosity || 0) * 0.5;

    const negativeMass =
      (rawScoresMap.sadness || 0) * 1.0 +
      (rawScoresMap.anger || 0) * 1.0 +
      (rawScoresMap.fear || 0) * 0.9 +
      (rawScoresMap.disgust || 0) * 0.9 +
      (rawScoresMap.contempt || 0) * 0.7 +
      (rawScoresMap.boredom || 0) * 0.5;

    const totalMass = positiveMass + negativeMass + (rawScoresMap.neutral || 0) * 0.5 + 0.001;
    const valenceScore = Math.max(-1.0, Math.min(1.0, (positiveMass - negativeMass) / totalMass));

    const highArousalMass =
      (rawScoresMap.excitement || 0) +
      (rawScoresMap.anger || 0) +
      (rawScoresMap.fear || 0) +
      (rawScoresMap.surprise || 0);

    const lowArousalMass =
      (rawScoresMap.serenity || 0) +
      (rawScoresMap.boredom || 0) +
      (rawScoresMap.neutral || 0) * 0.8;

    const arousalScore = Math.max(
      0.0,
      Math.min(1.0, 0.35 + (highArousalMass * 0.45 - lowArousalMass * 0.35))
    );

    const expressiveness = Math.min(1.0, maxNonNeutral * 1.2);

    return {
      primary,
      secondary,
      emotions: smoothedList,
      valenceScore: Math.round(valenceScore * 100) / 100,
      arousalScore: Math.round(arousalScore * 100) / 100,
      expressiveness: Math.round(expressiveness * 100) / 100,
    };
  }
}

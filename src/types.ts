export interface SmoothedBox {
  x: number;
  y: number;
  width: number;
  height: number;
  class: string;
  score: number;
  opacity: number;
  labelX: number;
  labelY: number;
}

export type GazeDirection = 
  | 'DIRECT FOCUS' 
  | 'LOOKING LEFT' 
  | 'LOOKING RIGHT' 
  | 'LOOKING UP' 
  | 'LOOKING DOWN' 
  | 'EYES CLOSED';

export interface Point2D {
  x: number;
  y: number;
}

export interface OcularData {
  leftOpenness: number;    // 0 = fully closed, 1 = fully open
  rightOpenness: number;   // 0 = fully closed, 1 = fully open
  averageOpenness: number; // 0 = fully closed, 1 = fully open
  isClosed: boolean;       // both eyes closed
  isWinkingLeft: boolean;  // left eye closed, right open
  isWinkingRight: boolean; // right eye closed, left open
  squint: number;          // 0 to 1
  wide: number;            // 0 to 1
  gazeX: number;           // -1 (left) to +1 (right)
  gazeY: number;           // -1 (down) to +1 (up)
  gazeDirection: GazeDirection;
  blinkCount: number;
  blinkRate: number;       // blinks per minute
  lastBlinkTime: number;
  isBlinkingNow: boolean;
  eyeStateLabel: string;   // e.g. "Direct Focus", "Meditative / Closed", "Wide-Eyed Wonder", "Left Wink", etc.
  leftIris: Point2D | null;
  rightIris: Point2D | null;
  leftEyeContour: Point2D[];
  rightEyeContour: Point2D[];
}

export interface FaceBlendshapeState {
  smile: number;
  frown: number;
  mouthOpen: number;
  browRaise: number;
  eyeBlink: number;
  pucker: number;
  cheekSquint?: number;
  noseSneer?: number;
  jawOpen?: number;
  mouthPress?: number;
}

export interface EmotionMetric {
  id: string;
  name: string;
  label: string;
  score: number;
  rawScore: number;
  valence: 'positive' | 'negative' | 'neutral' | 'complex';
  arousal: 'high' | 'medium' | 'low';
  emoji: string;
  description: string;
  category: 'joy' | 'calm' | 'cognitive' | 'reactive' | 'tension' | 'fatigue';
  facsActionUnits: string;
  color: string;
}

export interface ConsoleState {
  emotion: string;
  secondaryEmotion?: string | null;
  emotions: EmotionMetric[];
  valence: number;
  arousal: number;
  expressiveness: number;
  objects: string[];
  blendshapes: FaceBlendshapeState;
  ocular: OcularData;
}


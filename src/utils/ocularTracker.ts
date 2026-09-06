import { OcularData, GazeDirection, Point2D } from '../types';

export const INITIAL_OCULAR_DATA: OcularData = {
  leftOpenness: 1,
  rightOpenness: 1,
  averageOpenness: 1,
  isClosed: false,
  isWinkingLeft: false,
  isWinkingRight: false,
  squint: 0,
  wide: 0,
  gazeX: 0,
  gazeY: 0,
  gazeDirection: 'DIRECT FOCUS',
  blinkCount: 0,
  blinkRate: 16,
  lastBlinkTime: 0,
  isBlinkingNow: false,
  eyeStateLabel: 'Awaiting Eyes...',
  leftIris: null,
  rightIris: null,
  leftEyeContour: [],
  rightEyeContour: []
};

// MediaPipe FaceMesh Indices
const LEFT_EYE_CONTOUR_INDICES = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7];
const RIGHT_EYE_CONTOUR_INDICES = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382];

export class OcularTracker {
  private smoothedGazeX = 0;
  private smoothedGazeY = 0;
  private smoothedLeftOpenness = 1;
  private smoothedRightOpenness = 1;
  private smoothedSquint = 0;
  private smoothedWide = 0;

  private blinkCount = 0;
  private lastBlinkTimestamp = 0;
  private blinkTimestamps: number[] = [];
  private wasClosed = false;
  private closedStartTime = 0;

  // Callback when a dynamic blink event happens
  public onBlink?: () => void;
  // Callback when a wink event happens
  public onWink?: (side: 'left' | 'right') => void;

  public reset() {
    this.smoothedGazeX = 0;
    this.smoothedGazeY = 0;
    this.smoothedLeftOpenness = 1;
    this.smoothedRightOpenness = 1;
    this.smoothedSquint = 0;
    this.smoothedWide = 0;
    this.blinkCount = 0;
    this.blinkTimestamps = [];
    this.wasClosed = false;
  }

  public process(
    landmarks: { x: number; y: number; z?: number }[] | undefined,
    blendshapesCategories: { categoryName: string; score: number }[] | undefined,
    currentTime: number
  ): OcularData {
    if (!landmarks || landmarks.length === 0) {
      return { ...INITIAL_OCULAR_DATA };
    }

    const getScore = (name: string): number => {
      if (!blendshapesCategories) return 0;
      const found = blendshapesCategories.find(c => c.categoryName === name);
      return found ? found.score : 0;
    };

    // Raw blendshapes
    const blinkL = getScore('eyeBlinkLeft');
    const blinkR = getScore('eyeBlinkRight');
    const lookUpL = getScore('eyeLookUpLeft');
    const lookUpR = getScore('eyeLookUpRight');
    const lookDownL = getScore('eyeLookDownLeft');
    const lookDownR = getScore('eyeLookDownRight');
    const lookInL = getScore('eyeLookInLeft');
    const lookOutL = getScore('eyeLookOutLeft');
    const lookInR = getScore('eyeLookInRight');
    const lookOutR = getScore('eyeLookOutRight');
    const squintL = getScore('eyeSquintLeft');
    const squintR = getScore('eyeSquintRight');
    const wideL = getScore('eyeWideLeft');
    const wideR = getScore('eyeWideRight');

    // Horizontal gaze calculation:
    // Left eye lookIn is towards nose (rightward), lookOut is leftward
    // Right eye lookIn is towards nose (leftward), lookOut is rightward
    const rawRightward = (lookInL + lookOutR) / 2;
    const rawLeftward = (lookOutL + lookInR) / 2;
    let rawGazeX = (rawRightward - rawLeftward) * 2.0;

    // Vertical gaze
    const rawUpward = (lookUpL + lookUpR) / 2;
    const rawDownward = (lookDownL + lookDownR) / 2;
    let rawGazeY = (rawUpward - rawDownward) * 2.0;

    // Direct landmark iris support if 478 landmarks model loaded
    let leftIrisPoint: Point2D | null = null;
    let rightIrisPoint: Point2D | null = null;

    if (landmarks.length >= 478) {
      leftIrisPoint = { x: landmarks[468].x, y: landmarks[468].y };
      rightIrisPoint = { x: landmarks[473].x, y: landmarks[473].y };

      // Optional fine-tuning of gaze using iris displacement relative to eye corners
      const lInner = landmarks[133];
      const lOuter = landmarks[33];
      const eyeSpanL = Math.hypot(lInner.x - lOuter.x, lInner.y - lOuter.y);
      if (eyeSpanL > 0.001) {
        const lCenter = { x: (lInner.x + lOuter.x) / 2, y: (lInner.y + lOuter.y) / 2 };
        const irisOffsetXL = (leftIrisPoint.x - lCenter.x) / eyeSpanL;
        // Blend in landmark-based gaze for enhanced precision
        rawGazeX = rawGazeX * 0.5 + irisOffsetXL * 3.0 * 0.5;
      }
    } else {
      // Fallback center approximation using eyelid landmarks
      if (landmarks[159] && landmarks[145]) {
        leftIrisPoint = {
          x: (landmarks[159].x + landmarks[145].x) / 2,
          y: (landmarks[159].y + landmarks[145].y) / 2
        };
      }
      if (landmarks[386] && landmarks[374]) {
        rightIrisPoint = {
          x: (landmarks[386].x + landmarks[374].x) / 2,
          y: (landmarks[386].y + landmarks[374].y) / 2
        };
      }
    }

    // Smooth values with responsive lerp
    const lerp = 0.22;
    this.smoothedGazeX += (Math.max(-1, Math.min(1, rawGazeX)) - this.smoothedGazeX) * lerp;
    this.smoothedGazeY += (Math.max(-1, Math.min(1, rawGazeY)) - this.smoothedGazeY) * lerp;

    const rawOpenL = Math.max(0, Math.min(1, 1 - blinkL));
    const rawOpenR = Math.max(0, Math.min(1, 1 - blinkR));
    this.smoothedLeftOpenness += (rawOpenL - this.smoothedLeftOpenness) * 0.35;
    this.smoothedRightOpenness += (rawOpenR - this.smoothedRightOpenness) * 0.35;

    const rawSquint = (squintL + squintR) / 2;
    const rawWide = (wideL + wideR) / 2;
    this.smoothedSquint += (rawSquint - this.smoothedSquint) * lerp;
    this.smoothedWide += (rawWide - this.smoothedWide) * lerp;

    const avgOpenness = (this.smoothedLeftOpenness + this.smoothedRightOpenness) / 2;
    const isClosed = this.smoothedLeftOpenness < 0.32 && this.smoothedRightOpenness < 0.32;
    const isWinkingLeft = this.smoothedLeftOpenness < 0.32 && this.smoothedRightOpenness > 0.65;
    const isWinkingRight = this.smoothedRightOpenness < 0.32 && this.smoothedLeftOpenness > 0.65;

    // Wink trigger
    if (isWinkingLeft && this.onWink) {
      this.onWink('left');
    } else if (isWinkingRight && this.onWink) {
      this.onWink('right');
    }

    // Blink tracking logic
    let isBlinkingNow = false;
    const rawBothClosed = blinkL > 0.6 && blinkR > 0.6;
    if (rawBothClosed && !this.wasClosed) {
      this.wasClosed = true;
      this.closedStartTime = currentTime;
    } else if (!rawBothClosed && this.wasClosed) {
      const closedDuration = currentTime - this.closedStartTime;
      this.wasClosed = false;
      // Normal natural blink takes between 80ms and 500ms
      if (closedDuration >= 70 && closedDuration <= 600) {
        this.blinkCount++;
        this.lastBlinkTimestamp = currentTime;
        this.blinkTimestamps.push(currentTime);
        isBlinkingNow = true;
        if (this.onBlink) {
          this.onBlink();
        }
      }
    }

    // Keep blink timestamps for last 60 seconds
    this.blinkTimestamps = this.blinkTimestamps.filter(t => currentTime - t < 60000);
    const blinkRate = this.blinkTimestamps.length > 0 
      ? Math.round((this.blinkTimestamps.length / Math.max(10, (currentTime - (this.blinkTimestamps[0] || currentTime)) / 1000)) * 60)
      : 14;

    // Gaze direction classification
    let gazeDirection: GazeDirection = 'DIRECT FOCUS';
    if (isClosed) {
      gazeDirection = 'EYES CLOSED';
    } else if (this.smoothedGazeX < -0.25) {
      gazeDirection = 'LOOKING LEFT';
    } else if (this.smoothedGazeX > 0.25) {
      gazeDirection = 'LOOKING RIGHT';
    } else if (this.smoothedGazeY > 0.25) {
      gazeDirection = 'LOOKING UP';
    } else if (this.smoothedGazeY < -0.25) {
      gazeDirection = 'LOOKING DOWN';
    }

    // Eye state descriptive label
    let eyeStateLabel = 'Direct Focus';
    if (isClosed) {
      eyeStateLabel = 'Meditative / Eyes Closed';
    } else if (isWinkingLeft) {
      eyeStateLabel = 'Wink (Left)';
    } else if (isWinkingRight) {
      eyeStateLabel = 'Wink (Right)';
    } else if (this.smoothedWide > 0.25) {
      eyeStateLabel = 'Wide-Eyed Wonder';
    } else if (this.smoothedSquint > 0.35) {
      eyeStateLabel = 'Scrutinizing Focus';
    } else if (gazeDirection === 'LOOKING LEFT') {
      eyeStateLabel = 'Scanning Left';
    } else if (gazeDirection === 'LOOKING RIGHT') {
      eyeStateLabel = 'Scanning Right';
    } else if (gazeDirection === 'LOOKING UP') {
      eyeStateLabel = 'Contemplative / Looking Up';
    } else if (gazeDirection === 'LOOKING DOWN') {
      eyeStateLabel = 'Introspective / Looking Down';
    }

    // Eye contours
    const leftEyeContour: Point2D[] = LEFT_EYE_CONTOUR_INDICES.map(idx => ({
      x: landmarks[idx].x,
      y: landmarks[idx].y
    }));
    const rightEyeContour: Point2D[] = RIGHT_EYE_CONTOUR_INDICES.map(idx => ({
      x: landmarks[idx].x,
      y: landmarks[idx].y
    }));

    return {
      leftOpenness: this.smoothedLeftOpenness,
      rightOpenness: this.smoothedRightOpenness,
      averageOpenness: avgOpenness,
      isClosed,
      isWinkingLeft,
      isWinkingRight,
      squint: this.smoothedSquint,
      wide: this.smoothedWide,
      gazeX: this.smoothedGazeX,
      gazeY: this.smoothedGazeY,
      gazeDirection,
      blinkCount: this.blinkCount,
      blinkRate: Math.min(60, Math.max(0, blinkRate)),
      lastBlinkTime: this.lastBlinkTimestamp,
      isBlinkingNow,
      eyeStateLabel,
      leftIris: leftIrisPoint,
      rightIris: rightIrisPoint,
      leftEyeContour,
      rightEyeContour
    };
  }
}

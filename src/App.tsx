import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import {
  Camera,
  Square,
  Play,
  Music,
  Loader2,
  AlertCircle,
  Activity,
  Cpu,
  Info,
  X,
  Eye,
} from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { motion, AnimatePresence } from 'motion/react';
import * as Tone from 'tone';

import { SmoothedBox, ConsoleState, OcularData } from './types';
import { OcularTracker, INITIAL_OCULAR_DATA } from './utils/ocularTracker';
import { drawOcularHUD } from './utils/ocularRenderer';
import { ProceduralMusicEngine } from './audio/ProceduralMusicEngine';
import { PCMPlayer } from './audio/PCMPlayer';
import { getVibeFromGemini, getVibeForObjectsAndEyes } from './services/vibeService';
import { OcularTelemetryCard } from './components/OcularTelemetryCard';
import { BiometricPanel } from './components/BiometricPanel';
import { EmotionClassifier, EMOTION_DEFINITIONS } from './utils/emotionClassifier';
import { EmotionSpectrumPanel } from './components/EmotionSpectrumPanel';

let hoverSynth: Tone.Synth | null = null;

async function initAudio() {
  if (Tone.context.state !== 'running') {
    await Tone.start().catch(() => {});
  }
  if (!hoverSynth) {
    hoverSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.01 },
    }).toDestination();
    hoverSynth.volume.value = -15;
  }
}

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [status, setStatus] = useState('Loading Object Detection Model...');
  const [currentPrompt, setCurrentPrompt] = useState('Waiting for camera...');
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [biometricView, setBiometricView] = useState<'face' | 'eyes'>('eyes');
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [studyAlert, setStudyAlert] = useState(false);

  const [consoleState, setConsoleState] = useState<ConsoleState>({
    emotion: 'Composed',
    secondaryEmotion: null,
    emotions: EMOTION_DEFINITIONS.map((d) => ({
      ...d,
      score: d.id === 'neutral' ? 1.0 : 0.0,
      rawScore: d.id === 'neutral' ? 1.0 : 0.0,
    })),
    valence: 0.0,
    arousal: 0.2,
    expressiveness: 0.0,
    objects: [],
    blendshapes: { smile: 0, frown: 0, mouthOpen: 0, browRaise: 0, eyeBlink: 0, pucker: 0 },
    ocular: INITIAL_OCULAR_DATA,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const playerRef = useRef<PCMPlayer | null>(null);
  const proceduralEngineRef = useRef<ProceduralMusicEngine | null>(null);
  const ocularTrackerRef = useRef<OcularTracker>(new OcularTracker());
  const emotionClassifierRef = useRef<EmotionClassifier>(new EmotionClassifier());

  const objectModelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const isPlayingRef = useRef(false);
  const lastStateRef = useRef<string>('');
  const pendingStateRef = useRef<string | null>(null);
  const vibeTimeoutRef = useRef<any>(null);
  const lastStateUpdateTimeRef = useRef<number>(0);
  const detectLoopRef = useRef<number | null>(null);
  const smoothedBoxesRef = useRef<Map<string, SmoothedBox>>(new Map());
  const smoothedBlendshapesRef = useRef({ smile: 0, frown: 0, mouthOpen: 0, browRaise: 0, eyeBlink: 0, pucker: 0 });
  const currentOcularRef = useRef<OcularData>(INITIAL_OCULAR_DATA);
  const isStudyModeRef = useRef(false);
  const distractionStartTimeRef = useRef<number | null>(null);
  const isAlertingRef = useRef(false);

  const playHoverSound = () => {
    try {
      initAudio();
      if (!hoverSynth || Tone.context.state !== 'running') return;
      const now = Tone.now();
      hoverSynth.triggerAttackRelease(800, 0.1, now);
      hoverSynth.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    } catch (e) {}
  };

  useEffect(() => {
    const handleInteraction = () => initAudio();
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // Hook ocular tracker audio callbacks
  useEffect(() => {
    ocularTrackerRef.current.onBlink = () => {
      if (proceduralEngineRef.current && proceduralEngineRef.current.isPlaying) {
        proceduralEngineRef.current.triggerBlinkChime();
      }
    };
    ocularTrackerRef.current.onWink = (side) => {
      if (proceduralEngineRef.current && proceduralEngineRef.current.isPlaying) {
        proceduralEngineRef.current.triggerWinkFlourish(side);
      }
    };
  }, []);

  useEffect(() => {
    // Load TensorFlow, COCO-SSD, and MediaPipe FaceLandmarker
    const loadModels = async () => {
      try {
        await tf.ready();
        const cocoModel = await cocoSsd.load();
        objectModelRef.current = cocoModel;

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
        );
        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
          numFaces: 1,
        });
        faceLandmarkerRef.current = faceLandmarker;

        setIsModelLoaded(true);
        setStatus('Idle');
      } catch (err: any) {
        console.error('Failed to load models:', err);
        setStatus('Error loading models');
        setErrorMsg(err.message);
      }
    };

    loadModels();

    return () => {
      stopSession();
    };
  }, []);

  const runDetection = async () => {
    if (!isPlayingRef.current || !videoRef.current || !canvasRef.current || !objectModelRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState >= 2 && ctx) {
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      try {
        const predictions = await objectModelRef.current.detect(video);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const detectedClasses = new Set<string>();

        // --- Object Smoothing Logic ---
        const newSmoothedBoxes = new Map<string, SmoothedBox>();
        const unassignedPredictions = [...predictions];

        smoothedBoxesRef.current.forEach((box, id) => {
          let closestIdx = -1;
          let minDist = Infinity;
          unassignedPredictions.forEach((pred, idx) => {
            if (pred.class === box.class) {
              const [px, py, pw, ph] = pred.bbox;
              const dist = Math.hypot(px + pw / 2 - (box.x + box.width / 2), py + ph / 2 - (box.y + box.height / 2));
              if (dist < 150) {
                if (dist < minDist) {
                  minDist = dist;
                  closestIdx = idx;
                }
              }
            }
          });

          if (closestIdx !== -1) {
            const pred = unassignedPredictions[closestIdx];
            const [px, py, pw, ph] = pred.bbox;
            const lerp = 0.15;
            box.x += (px - box.x) * lerp;
            box.y += (py - box.y) * lerp;
            box.width += (pw - box.width) * lerp;
            box.height += (ph - box.height) * lerp;
            box.opacity = Math.min(1, box.opacity + 0.1);
            box.score = pred.score;

            const targetLabelX = box.x + box.width + 20;
            const targetLabelY = box.y - 20;
            box.labelX += (targetLabelX - box.labelX) * lerp;
            box.labelY += (targetLabelY - box.labelY) * lerp;

            newSmoothedBoxes.set(id, box);
            unassignedPredictions.splice(closestIdx, 1);
            detectedClasses.add(box.class);
          } else {
            box.opacity -= 0.05;
            if (box.opacity > 0) {
              newSmoothedBoxes.set(id, box);
              detectedClasses.add(box.class);
            }
          }
        });

        unassignedPredictions.forEach((pred) => {
          const id = Math.random().toString(36).substring(7);
          const [x, y, width, height] = pred.bbox;
          newSmoothedBoxes.set(id, {
            x,
            y,
            width,
            height,
            class: pred.class,
            score: pred.score,
            opacity: 0,
            labelX: x + width + 40,
            labelY: y - 40,
          });
          detectedClasses.add(pred.class);
        });

        smoothedBoxesRef.current = newSmoothedBoxes;

        // --- Draw Detected Object Boxes ---
        smoothedBoxesRef.current.forEach((box) => {
          const { x, y, width, height, opacity, labelX, labelY } = box;
          const text = `${box.class} (${Math.round(box.score * 100)}%)`;

          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
          ctx.lineWidth = 1;

          const cornerLength = Math.min(15, width / 4, height / 4);
          ctx.beginPath();
          ctx.moveTo(x, y + cornerLength);
          ctx.lineTo(x, y);
          ctx.lineTo(x + cornerLength, y);

          ctx.moveTo(x + width - cornerLength, y);
          ctx.lineTo(x + width, y);
          ctx.lineTo(x + width, y + cornerLength);

          ctx.moveTo(x + width, y + height - cornerLength);
          ctx.lineTo(x + width, y + height);
          ctx.lineTo(x + width - cornerLength, y + height);

          ctx.moveTo(x + cornerLength, y + height);
          ctx.lineTo(x, y + height);
          ctx.lineTo(x, y + height - cornerLength);
          ctx.stroke();

          // Crosshair center
          ctx.beginPath();
          ctx.moveTo(x + width / 2 - 5, y + height / 2);
          ctx.lineTo(x + width / 2 + 5, y + height / 2);
          ctx.moveTo(x + width / 2, y + height / 2 - 5);
          ctx.lineTo(x + width / 2, y + height / 2 + 5);
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.4})`;
          ctx.stroke();

          // Line to label
          ctx.beginPath();
          ctx.moveTo(x + width, y);
          ctx.lineTo(labelX, labelY + 16);
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
          ctx.setLineDash([2, 2]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Label
          ctx.font = '400 10px "JetBrains Mono", monospace';
          const textWidth = ctx.measureText(text).width;
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.2})`;
          ctx.fillRect(labelX, labelY, textWidth + 8, 16);
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
          ctx.fillText(text.toUpperCase(), labelX + 4, labelY + 11);
        });

        const classesArray = Array.from(detectedClasses).sort();

        let currentEmotion = 'Composed';
        let currentSecondaryEmotion: string | null = null;
        const currentBlendshapes = { smile: 0, frown: 0, mouthOpen: 0, browRaise: 0, eyeBlink: 0, pucker: 0 };
        let latestOcular = currentOcularRef.current;
        let emotionClassificationResult = emotionClassifierRef.current.classify(undefined, latestOcular);

        if (faceLandmarkerRef.current) {
          const faceResult = faceLandmarkerRef.current.detectForVideo(video, performance.now());

          // Process rich Ocular Data
          if (faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0) {
            const rawBlendshapes = faceResult.faceBlendshapes && faceResult.faceBlendshapes.length > 0
              ? faceResult.faceBlendshapes[0].categories
              : undefined;

            latestOcular = ocularTrackerRef.current.process(
              faceResult.faceLandmarks[0],
              rawBlendshapes,
              performance.now()
            );
            currentOcularRef.current = latestOcular;

            // Continually modulate Procedural Audio with real-time Ocular metrics
            if (proceduralEngineRef.current) {
              proceduralEngineRef.current.updateOcularState(latestOcular);
            }
          }

          // Draw Biometric secondary canvas (Face Mesh or Ocular Zoom)
          if (faceCanvasRef.current && faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0) {
            const fCanvas = faceCanvasRef.current;
            const fCtx = fCanvas.getContext('2d');
            if (fCtx) {
              fCtx.clearRect(0, 0, fCanvas.width, fCanvas.height);
              const landmarks = faceResult.faceLandmarks[0];

              if (biometricView === 'eyes') {
                // OCULAR ZOOM VIEW: focused directly on orbital eye regions
                fCtx.save();
                // Determine bounding box around both eyes (landmarks 33 to 263)
                const leftCorner = landmarks[33];
                const rightCorner = landmarks[263];
                const midX = ((leftCorner.x + rightCorner.x) / 2) * video.videoWidth;
                const midY = ((leftCorner.y + rightCorner.y) / 2) * video.videoHeight;
                const eyeSpan = Math.hypot(
                  (rightCorner.x - leftCorner.x) * video.videoWidth,
                  (rightCorner.y - leftCorner.y) * video.videoHeight
                );
                const zoomScale = (fCanvas.width / Math.max(80, eyeSpan * 1.6));

                fCtx.translate(fCanvas.width / 2, fCanvas.height / 2);
                fCtx.scale(zoomScale, zoomScale);
                fCtx.translate(-midX, -midY);

                // Draw orbital eye contours
                const drawContourPath = (indices: number[], strokeColor: string) => {
                  fCtx.beginPath();
                  indices.forEach((idx, i) => {
                    const pt = landmarks[idx];
                    const px = pt.x * video.videoWidth;
                    const py = pt.y * video.videoHeight;
                    if (i === 0) fCtx.moveTo(px, py);
                    else fCtx.lineTo(px, py);
                  });
                  fCtx.closePath();
                  fCtx.strokeStyle = strokeColor;
                  fCtx.lineWidth = 1.2 / zoomScale;
                  fCtx.stroke();
                };

                // Left & Right eye contours
                drawContourPath(
                  [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7],
                  'rgba(255, 255, 255, 0.7)'
                );
                drawContourPath(
                  [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382],
                  'rgba(255, 255, 255, 0.7)'
                );

                // Eyebrows
                drawContourPath([70, 63, 105, 66, 107, 55, 65, 52, 53, 46], 'rgba(255, 255, 255, 0.3)');
                drawContourPath([336, 296, 334, 293, 300, 276, 283, 282, 295, 285], 'rgba(255, 255, 255, 0.3)');

                // Draw iris points
                const drawIrisMarker = (irisPt: { x: number; y: number } | null, side: string) => {
                  if (!irisPt) return;
                  const ix = irisPt.x * video.videoWidth;
                  const iy = irisPt.y * video.videoHeight;

                  // Iris center
                  fCtx.fillStyle = '#ffffff';
                  fCtx.beginPath();
                  fCtx.arc(ix, iy, 2 / zoomScale, 0, Math.PI * 2);
                  fCtx.fill();

                  // Iris circle
                  fCtx.beginPath();
                  fCtx.arc(ix, iy, 7 / zoomScale, 0, Math.PI * 2);
                  fCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                  fCtx.lineWidth = 1 / zoomScale;
                  fCtx.stroke();

                  // Gaze ray
                  const rayX = ix + latestOcular.gazeX * (16 / zoomScale);
                  const rayY = iy - latestOcular.gazeY * (16 / zoomScale);
                  fCtx.beginPath();
                  fCtx.moveTo(ix, iy);
                  fCtx.lineTo(rayX, rayY);
                  fCtx.strokeStyle = 'rgba(250, 204, 21, 0.9)';
                  fCtx.lineWidth = 1.2 / zoomScale;
                  fCtx.stroke();
                };

                drawIrisMarker(latestOcular.leftIris, 'L');
                drawIrisMarker(latestOcular.rightIris, 'R');

                fCtx.restore();

                // Telemetry overlay on ocular zoom
                fCtx.font = '500 9px monospace';
                fCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                fCtx.fillText(`GAZE: ${latestOcular.gazeDirection}`, 8, 14);
                fCtx.fillText(`L: ${Math.round(latestOcular.leftOpenness * 100)}% | R: ${Math.round(latestOcular.rightOpenness * 100)}%`, 8, 26);
              } else {
                // FULL FACE MESH POINT CLOUD
                const time = performance.now() / 1500;
                let minX = video.videoWidth, maxX = 0, minY = video.videoHeight, maxY = 0;
                for (const pt of landmarks) {
                  const px = pt.x * video.videoWidth;
                  const py = pt.y * video.videoHeight;
                  if (px < minX) minX = px;
                  if (px > maxX) maxX = px;
                  if (py < minY) minY = py;
                  if (py > maxY) maxY = py;
                }
                const faceWidth = maxX - minX;
                const faceHeight = maxY - minY;
                const centerX = minX + faceWidth / 2;
                const centerY = minY + faceHeight / 2;
                const scanY = minY + ((Math.sin(time) + 1) / 2) * faceHeight;
                const scale = Math.min(fCanvas.width / faceWidth, fCanvas.height / faceHeight) * 0.8;

                for (const pt of landmarks) {
                  const px = pt.x * video.videoWidth;
                  const py = pt.y * video.videoHeight;
                  const dist = Math.abs(py - scanY) / faceHeight;
                  const opacity = Math.max(0.15, 1.0 - dist * 4);

                  fCtx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                  fCtx.beginPath();
                  const drawX = fCanvas.width / 2 + (px - centerX) * scale;
                  const drawY = fCanvas.height / 2 + (py - centerY) * scale;
                  fCtx.arc(drawX, drawY, 1.5, 0, 2 * Math.PI);
                  fCtx.fill();
                }
              }
            }
          }

          // Compute Comprehensive Human Emotions (All 18 Affective Dimensions)
          const rawBlendshapes = faceResult.faceBlendshapes && faceResult.faceBlendshapes.length > 0
            ? faceResult.faceBlendshapes[0].categories
            : undefined;

          emotionClassificationResult = emotionClassifierRef.current.classify(
            rawBlendshapes,
            latestOcular
          );

          currentEmotion = emotionClassificationResult.primary.label;
          currentSecondaryEmotion = emotionClassificationResult.secondary?.label || null;

          if (rawBlendshapes) {
            const getScore = (name: string) => rawBlendshapes.find(b => b.categoryName === name)?.score || 0;

            currentBlendshapes.smile = (getScore('mouthSmileLeft') + getScore('mouthSmileRight')) / 2;
            currentBlendshapes.frown = Math.min(1, (getScore('mouthFrownLeft') + getScore('mouthFrownRight') + getScore('mouthRollLower')) * 5);
            currentBlendshapes.mouthOpen = getScore('jawOpen');
            currentBlendshapes.browRaise = (getScore('browInnerUp') + getScore('browOuterUpLeft') + getScore('browOuterUpRight')) / 3;
            currentBlendshapes.eyeBlink = (getScore('eyeBlinkLeft') + getScore('eyeBlinkRight')) / 2;
            currentBlendshapes.pucker = getScore('mouthPucker');
          }

          // Render Futuristic Ocular HUD onto Main Video Canvas (displaying gaze and active affect)
          drawOcularHUD(ctx, canvas.width, canvas.height, latestOcular, performance.now(), currentEmotion);
        }

        // Throttle React State updates to ~10fps
        const now = performance.now();
        if (now - lastStateUpdateTimeRef.current > 100) {
          const smoothingFactor = 0.15;
          const smoothed = smoothedBlendshapesRef.current;
          smoothed.smile += (currentBlendshapes.smile - smoothed.smile) * smoothingFactor;
          smoothed.frown += (currentBlendshapes.frown - smoothed.frown) * smoothingFactor;
          smoothed.mouthOpen += (currentBlendshapes.mouthOpen - smoothed.mouthOpen) * smoothingFactor;
          smoothed.browRaise += (currentBlendshapes.browRaise - smoothed.browRaise) * smoothingFactor;
          smoothed.eyeBlink += (currentBlendshapes.eyeBlink - smoothed.eyeBlink) * smoothingFactor;
          smoothed.pucker += (currentBlendshapes.pucker - smoothed.pucker) * smoothingFactor;

          setConsoleState({
            emotion: currentEmotion,
            secondaryEmotion: currentSecondaryEmotion,
            emotions: emotionClassificationResult.emotions,
            valence: emotionClassificationResult.valenceScore,
            arousal: emotionClassificationResult.arousalScore,
            expressiveness: emotionClassificationResult.expressiveness,
            objects: classesArray,
            blendshapes: { ...smoothed },
            ocular: { ...latestOcular },
          });
          lastStateUpdateTimeRef.current = now;
        }

        // State string incorporates Ocular classification and emotional nuances for timely prompt adaptation
        const stateString = `${classesArray.join(',')}|${currentEmotion}|${currentSecondaryEmotion || ''}|${latestOcular.gazeDirection}|${latestOcular.eyeStateLabel}`;

        // Distraction Logic for Study Mode
        if (isStudyModeRef.current) {
          const isDistracted = 
            latestOcular.gazeDirection === 'Left' || 
            latestOcular.gazeDirection === 'Right' || 
            latestOcular.gazeDirection === 'Up' || 
            latestOcular.averageOpenness < 0.2 ||
            (!faceLandmarkerRef.current || !faceResult.faceLandmarks || faceResult.faceLandmarks.length === 0);
            
          if (isDistracted) {
            if (!distractionStartTimeRef.current) {
              distractionStartTimeRef.current = now;
            } else if (now - distractionStartTimeRef.current > 3000 && !isAlertingRef.current) {
              isAlertingRef.current = true;
              setStudyAlert(true);
              
              const utterance = new SpeechSynthesisUtterance("Please focus, Aditya Sir.");
              utterance.pitch = 1.1;
              utterance.rate = 1.0;
              window.speechSynthesis.speak(utterance);
            }
          } else {
            distractionStartTimeRef.current = null;
            if (isAlertingRef.current) {
              isAlertingRef.current = false;
              setStudyAlert(false);
            }
          }
        }

        if (stateString !== pendingStateRef.current) {
          pendingStateRef.current = stateString;

          if (vibeTimeoutRef.current) {
            clearTimeout(vibeTimeoutRef.current);
          }

          vibeTimeoutRef.current = setTimeout(async () => {
            if (stateString !== lastStateRef.current) {
              lastStateRef.current = stateString;

              const newVibe = await getVibeFromGemini(
                classesArray,
                currentEmotion,
                latestOcular,
                currentSecondaryEmotion
              );
              setCurrentPrompt(newVibe);

              // Update procedural sound engine
              if (proceduralEngineRef.current) {
                proceduralEngineRef.current.setVibe(newVibe);
              }

              // Update Lyria realtime prompt if active
              if (sessionRef.current) {
                sessionRef.current.setWeightedPrompts({
                  weightedPrompts: [{ text: newVibe, weight: 1.0 }],
                }).catch(console.error);
              }
            }
          }, 2400);
        }
      } catch (err) {
        console.error('Detection error:', err);
      }
    }

    if (isPlayingRef.current) {
      detectLoopRef.current = requestAnimationFrame(runDetection);
    }
  };

  const startSession = async () => {
    if (!isModelLoaded) return;

    try {
      setErrorMsg(null);
      setStatus('Starting camera...');

      let stream = streamRef.current;
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            },
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(e => console.error('Video play error:', e));
          }
          setIsCameraActive(true);
        } catch (camErr: any) {
          console.error('Camera error:', camErr);
          setStatus('Camera Error');
          setErrorMsg('Camera access denied. Please allow camera access in your browser settings, then refresh the page.');
          return;
        }
      }

      // Initialize Procedural Music Engine with eye responsiveness
      if (!proceduralEngineRef.current) {
        proceduralEngineRef.current = new ProceduralMusicEngine();
      }
      proceduralEngineRef.current.start();

      if (!isPlayingRef.current) {
        isPlayingRef.current = true;
        detectLoopRef.current = requestAnimationFrame(runDetection);
      }

      setStatus('Connected & Synthesizing');
      setIsPlaying(true);
      const initialPrompt = 'minimalist ambient drone, quiet contemplation';
      setCurrentPrompt(initialPrompt);
      proceduralEngineRef.current.setVibe(initialPrompt);

      // Attempt Lyria Realtime Connection in parallel if user has access
      playerRef.current = new PCMPlayer(48000);
      try {
        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        if (apiKey) {
          const ai = new GoogleGenAI({
            apiKey,
            apiVersion: 'v1alpha',
          });

          ai.live.music.connect({
            model: 'lyria-realtime-exp',
            callbacks: {
              onmessage: (message: any) => {
                const audioChunk = message.audioChunk;
                if (audioChunk?.data && playerRef.current) {
                  playerRef.current.playChunk(audioChunk.data);
                }
              },
              onclose: () => {
                console.log('Lyria closed, continuing with local procedural engine');
              },
              onerror: (err: any) => {
                console.warn('Lyria API not accessible, operating with local eye-reactive synthesizer:', err.message || err);
              },
            },
          }).then(async (session) => {
            sessionRef.current = session;
            await session.setMusicGenerationConfig({
              musicGenerationConfig: { bpm: 120, temperature: 1.0 },
            }).catch(() => {});
            await session.setWeightedPrompts({
              weightedPrompts: [{ text: initialPrompt, weight: 1.0 }],
            }).catch(() => {});
            session.play();
          }).catch((err) => {
            console.log('Lyria experimental connect notice (using high-fidelity procedural synth):', err.message || err);
          });
        }
      } catch (err) {
        console.log('Lyria init skipped, running local procedural engine');
      }
    } catch (err: any) {
      console.error('Setup Error:', err);
      setStatus('Failed to connect');
      setErrorMsg(err.message || 'An unknown error occurred during setup.');
      stopSession(false);
    }
  };

  const stopSession = (closeCamera: boolean = true) => {
    setIsPlaying(false);
    if (vibeTimeoutRef.current) {
      clearTimeout(vibeTimeoutRef.current);
      vibeTimeoutRef.current = null;
    }
    pendingStateRef.current = null;

    if (proceduralEngineRef.current) {
      proceduralEngineRef.current.stop();
    }
    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current = null;
    }
    if (sessionRef.current) {
      try { sessionRef.current.conn.close(); } catch (e) {}
      sessionRef.current = null;
    }

    setStatus('Idle');
    setConsoleState({
      emotion: 'Composed',
      secondaryEmotion: null,
      emotions: EMOTION_DEFINITIONS.map((d) => ({
        ...d,
        score: d.id === 'neutral' ? 1.0 : 0.0,
        rawScore: d.id === 'neutral' ? 1.0 : 0.0,
      })),
      valence: 0.0,
      arousal: 0.2,
      expressiveness: 0.0,
      objects: [],
      blendshapes: { smile: 0, frown: 0, mouthOpen: 0, browRaise: 0, eyeBlink: 0, pucker: 0 },
      ocular: INITIAL_OCULAR_DATA,
    });
    smoothedBlendshapesRef.current = { smile: 0, frown: 0, mouthOpen: 0, browRaise: 0, eyeBlink: 0, pucker: 0 };
    smoothedBoxesRef.current.clear();
    ocularTrackerRef.current.reset();
    emotionClassifierRef.current.reset();

    if (closeCamera) {
      isPlayingRef.current = false;
      setCurrentPrompt('Waiting for camera...');

      if (detectLoopRef.current) {
        cancelAnimationFrame(detectLoopRef.current);
        detectLoopRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setIsCameraActive(false);
      }
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-black text-white flex overflow-hidden font-mono relative">
      {/* Background Camera Feed */}
      <div className="absolute inset-0 z-0">
        {!isCameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 z-10 font-mono text-sm">
            <Camera className="w-8 h-8 mb-4 opacity-50" />
            <p>SYSTEM.CAMERA_OFFLINE</p>
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover grayscale contrast-125 opacity-60 transition-opacity duration-500 ${
            isCameraActive ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-500 z-[15] ${
            isCameraActive ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {/* Vignette & Scanlines */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] z-10" />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] z-10" />

        {/* Decorative HUD Elements */}
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center overflow-hidden">
          <div className="w-[150vw] h-[150vw] sm:w-[600px] sm:h-[600px] border border-white/10 rounded-full border-dashed animate-[spin_60s_linear_infinite] shrink-0" />
          <div className="absolute w-[100vw] h-[100vw] sm:w-[400px] sm:h-[400px] border border-white/5 rounded-full animate-[spin_40s_linear_infinite_reverse] shrink-0" />
          <div className="absolute w-px h-full bg-white/5" />
          <div className="absolute h-px w-full bg-white/5" />
        </div>
      </div>

      {/* Overlays */}
      <div className="relative z-20 w-full h-full pointer-events-auto p-4 sm:p-6 overflow-y-auto overflow-x-hidden pb-32 sm:pb-6">
        <div className="flex flex-col lg:flex-row justify-between gap-4 min-h-full">
          {/* Left Column */}
          <div className="contents lg:flex lg:flex-col lg:justify-between w-full lg:w-80 pointer-events-none shrink-0">
            {/* Top Left: System Status & Mobile Controls */}
            <div className="flex flex-col gap-4 shrink-0 order-1 lg:order-none pointer-events-auto">
              <div className="flex flex-col items-start gap-4 shrink-0">
                <div className="flex items-start justify-between w-full">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tighter text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
                      VISION_SYNC
                    </h1>
                    <p className="text-[10px] text-white/70 font-mono uppercase tracking-widest flex items-center gap-1.5">
                      <Eye className="w-2.5 h-2.5 text-white/80" />
                      Ocular Vision & Sound Engine v3.0
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Small Start/Stop Button (Mobile Landscape Only) */}
                    <button
                      onClick={() => {
                        playHoverSound();
                        isCameraActive ? stopSession(true) : startSession();
                      }}
                      onMouseEnter={playHoverSound}
                      disabled={!isModelLoaded}
                      className={`hidden landscape:flex lg:landscape:hidden justify-center items-center gap-2 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border backdrop-blur-md rounded-none ${
                        isCameraActive
                          ? 'bg-red-500/20 text-red-400 border-red-500 hover:bg-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                          : 'bg-white/10 text-white border-white hover:bg-white/20 shadow-[0_0_10px_rgba(255,255,255,0.3)]'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {!isModelLoaded ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> INIT</>
                      ) : isCameraActive ? (
                        <><Square className="w-3 h-3 fill-current" /> STOP</>
                      ) : (
                        <><Play className="w-3 h-3 fill-current" /> START</>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        playHoverSound();
                        setIsInfoOpen(true);
                      }}
                      onMouseEnter={playHoverSound}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md border border-white/20 shrink-0"
                      title="App Information"
                    >
                      <Info className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>
                <div className="text-xs font-mono text-white/80 flex items-center gap-2 bg-black/40 backdrop-blur px-3 py-1.5 border border-white/20">
                  <div
                    className={`w-2 h-2 rounded-none ${
                      status.includes('Synthesizing') || status.includes('Connected')
                        ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                        : status.includes('Connecting') || status.includes('Starting')
                        ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]'
                        : status === 'Loading Object Detection Model...'
                        ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]'
                        : status.includes('Error') || status.includes('Denied')
                        ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                        : 'bg-zinc-600'
                    }`}
                  />
                  {status}
                </div>
                
                {/* Study Mode Toggle */}
                <div className="flex items-center gap-3 bg-black/40 backdrop-blur px-3 py-2 border border-white/20">
                  <span className="text-xs font-mono text-white/80 uppercase tracking-widest">
                    Study Mode
                  </span>
                  <button
                    onClick={() => {
                      playHoverSound();
                      const nextState = !isStudyMode;
                      setIsStudyMode(nextState);
                      isStudyModeRef.current = nextState;
                      if (proceduralEngineRef.current) {
                        proceduralEngineRef.current.setStudyMode(nextState);
                      }
                      if (!nextState) {
                        distractionStartTimeRef.current = null;
                        isAlertingRef.current = false;
                        setStudyAlert(false);
                      }
                    }}
                    disabled={!isPlaying}
                    className={`relative w-10 h-5 rounded-full transition-colors ${isStudyMode ? 'bg-emerald-500' : 'bg-white/20'} disabled:opacity-50`}
                  >
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${isStudyMode ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* Mobile Controls (Hidden on Desktop & Landscape) */}
              <div className="flex lg:hidden landscape:hidden flex-col items-stretch gap-4 shrink-0">
                <button
                  onClick={() => {
                    playHoverSound();
                    isCameraActive ? stopSession(true) : startSession();
                  }}
                  onMouseEnter={playHoverSound}
                  disabled={!isModelLoaded}
                  className={`flex justify-center items-center gap-3 px-10 py-4 font-mono text-sm font-bold uppercase tracking-widest transition-all duration-300 border-2 backdrop-blur-md ${
                    isCameraActive
                      ? 'bg-red-500/20 text-red-400 border-red-500 hover:bg-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                      : 'bg-white/10 text-white border-white hover:bg-white/20 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {!isModelLoaded ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> INITIALIZING...</>
                  ) : isCameraActive ? (
                    <><Square className="w-5 h-5 fill-current" /> STOP SYSTEM</>
                  ) : (
                    <><Play className="w-5 h-5 fill-current" /> START SYSTEM</>
                  )}
                </button>
              </div>

              {/* Mobile Camera Viewport Spacer */}
              <div className="h-[30vh] landscape:h-[100vh] lg:hidden pointer-events-none shrink-0" />
            </div>

            {/* Bottom Left: Biometric Scan & Ocular Radar Card */}
            <div className="flex flex-col gap-4 shrink-0 lg:mt-auto order-4 lg:order-none pointer-events-auto">
              {/* Biometric Scan (Face vs Ocular Zoom) */}
              <BiometricPanel
                canvasRef={faceCanvasRef}
                isCameraActive={isCameraActive}
                activeView={biometricView}
                onViewChange={setBiometricView}
              />

              {/* Real-time Ocular Telemetry Card */}
              <OcularTelemetryCard
                ocular={consoleState.ocular}
                isCameraActive={isCameraActive}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="contents lg:flex lg:flex-col lg:justify-between lg:items-end w-full lg:w-80 pointer-events-none shrink-0 mt-0">
            {/* Top Right: Desktop Controls */}
            <div className="hidden lg:flex flex-col items-end gap-4 shrink-0 order-none pointer-events-auto">
              <button
                onClick={() => {
                  playHoverSound();
                  isCameraActive ? stopSession(true) : startSession();
                }}
                onMouseEnter={playHoverSound}
                disabled={!isModelLoaded}
                className={`flex justify-center items-center gap-3 px-10 py-4 font-mono text-sm font-bold uppercase tracking-widest transition-all duration-300 border-2 backdrop-blur-md ${
                  isCameraActive
                    ? 'bg-red-500/20 text-red-400 border-red-500 hover:bg-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                    : 'bg-white/10 text-white border-white hover:bg-white/20 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {!isModelLoaded ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> INITIALIZING...</>
                ) : isCameraActive ? (
                  <><Square className="w-5 h-5 fill-current" /> STOP SYSTEM</>
                ) : (
                  <><Play className="w-5 h-5 fill-current" /> START SYSTEM</>
                )}
              </button>
            </div>

            {/* Bottom Right: Affective State, Entities & Audio Profile */}
            <div className="flex flex-col gap-4 shrink-0 w-full order-2 lg:order-none pointer-events-auto">
              {/* Comprehensive Affective State & Emotion Spectrum */}
              <EmotionSpectrumPanel
                emotions={consoleState.emotions}
                primaryEmotionName={consoleState.emotion}
                secondaryEmotionName={consoleState.secondaryEmotion}
                valenceScore={consoleState.valence}
                arousalScore={consoleState.arousal}
                expressiveness={consoleState.expressiveness}
              />

              {/* Detected Entities */}
              <div
                className="w-full bg-black/40 backdrop-blur-md border border-white/20 p-4 shadow-[0_0_30px_rgba(0,0,0,0.8)]"
                title="Objects detected in the environment"
              >
                <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Cpu className="w-3 h-3" />
                  Entities
                </h3>
                {consoleState.objects.length === 0 ? (
                  <p className="text-[10px] text-white/40 italic">No external objects detected.</p>
                ) : (
                  <ul className="space-y-1">
                    <AnimatePresence>
                      {consoleState.objects.map((obj) => (
                        <motion.li
                          key={obj}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="text-[10px] flex items-center gap-2 text-white/90 uppercase tracking-wider"
                        >
                          <span className="w-1 h-1 bg-white shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
                          {obj}
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </div>

              {/* Audio Profile */}
              <div
                className="w-full bg-black/40 backdrop-blur-md border border-white/20 p-4 shadow-[0_0_30px_rgba(0,0,0,0.8)]"
                title="Soundscape generated from ocular state, expressions, and objects"
              >
                <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Music className="w-3 h-3" />
                  Reactive Soundscape Profile
                </h3>
                <div className="relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-0.5 h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                  <p className="text-xs leading-relaxed text-white/90 pl-3">
                    {currentPrompt}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Modal */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-red-500/50 p-6 max-w-md w-full shadow-[0_0_40px_rgba(239,68,68,0.2)] relative"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-red-500/10 border border-red-500/30 shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-500 uppercase tracking-widest">{status}</h3>
                  <p className="text-sm mt-2 text-red-400/80 leading-relaxed">{errorMsg}</p>
                </div>
              </div>

              <button
                onClick={() => setErrorMsg(null)}
                className={`w-full py-3 text-xs font-mono font-bold uppercase tracking-widest transition-colors ${
                  status === 'Camera Error'
                    ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400'
                    : 'bg-white/5 hover:bg-white/10 border border-white/20 text-white/70'
                }`}
              >
                Dismiss
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Modal */}
      <AnimatePresence>
        {isInfoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto"
            onClick={() => setIsInfoOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-white/20 p-6 max-w-lg w-full shadow-[0_0_40px_rgba(0,0,0,0.8)] relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex flex-col-reverse sm:flex-row sm:items-start justify-between gap-4 mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 self-start">
                  <Eye className="w-5 h-5 shrink-0" />
                  About Vision Sync & Ocular Tracking
                </h2>
                <button
                  onClick={() => setIsInfoOpen(false)}
                  className="p-2 shrink-0 border border-white/20 bg-black/50 hover:bg-white/10 text-white/50 hover:text-white transition-colors self-end sm:self-auto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-sm text-white/80 leading-relaxed">
                <p>
                  <strong>Vision Sync</strong> uses your camera to track facial expressions, environmental objects, and deeply analyzes <strong>eye movements</strong> to generate real-time reactive ambient music.
                </p>

                <div className="p-3 bg-white/5 border border-white/10 space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-white" />
                    How Your Eyes Modulate the Music:
                  </h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-white/70">
                    <li><strong>Eye Openness & Meditation:</strong> Closing your eyes lowers the master audio filter into a warm, muffled drone with a pulsing meditative pad. Wide eyes open up bright, crystalline sparkling harmonics.</li>
                    <li><strong>Horizontal Gaze & Stereo Panning:</strong> Looking to the left pans the music toward the left ear; looking right pans the ambient reflections to the right.</li>
                    <li><strong>Vertical Gaze & Harmonic Register:</strong> Looking up shifts lead notes into higher celestial octaves; looking down anchors deep sub-bass frequencies.</li>
                    <li><strong>Blink Sonification:</strong> Every natural blink triggers an ethereal glass droplet chime tuned to the ambient scale.</li>
                    <li><strong>Wink Detection:</strong> Winking with either eye triggers an ascending or descending playful musical flourish.</li>
                  </ul>
                </div>

                <div className="p-3 bg-white/5 border border-white/10 space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-white" />
                    Full Human Affective Spectrum (18 Detectable States):
                  </h4>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Vision Sync models the human emotional spectrum using MediaPipe ARKit 52-blendshape FACS (Facial Action Coding System) telemetry mapped to the 2D Russell Circumplex of Affect (Valence &times; Arousal):
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-white/70 pt-1">
                    <div>
                      <span className="font-bold text-emerald-400 block mb-0.5">Positive & Elevated:</span>
                      Joy, Euphoria, Serenity, Amusement, Pride, Love/Affection
                    </div>
                    <div>
                      <span className="font-bold text-amber-400 block mb-0.5">Focused & Reactive:</span>
                      Awe/Wonder, Curiosity, Surprise, Determination, Relief, Composed
                    </div>
                    <div>
                      <span className="font-bold text-rose-400 block mb-0.5">Tension & High Arousal:</span>
                      Anger, Fear, Disgust, Anxiety
                    </div>
                    <div>
                      <span className="font-bold text-sky-400 block mb-0.5">Low Valence / Inward:</span>
                      Sadness, Melancholy
                    </div>
                  </div>
                </div>

                <ul className="list-disc pl-5 space-y-2 text-white/70">
                  <li><strong>Biometric Scan:</strong> Toggle between the full 3D face point cloud and a high-density Ocular Zoom showing exact eyelid wireframes and iris tracking.</li>
                  <li><strong>Entities:</strong> Objects detected in your surroundings (laptops, cups, plants) subtly shape the harmonic mood.</li>
                  <li><strong>Soundscape Profile:</strong> The system continuously adapts ambient prompts and procedural synthesis in harmony with your gaze and expressions.</li>
                </ul>

                <p className="text-xs text-white/50 mt-4 pt-4 border-t border-white/10">
                  Privacy note: All computer vision and audio synthesis run locally in your browser. No video is ever saved or transmitted.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Study Mode Alert Overlay */}
      <AnimatePresence>
        {studyAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-red-600/90 backdrop-blur-md border-4 border-red-500 p-8 sm:p-12 shadow-[0_0_100px_rgba(239,68,68,0.8)] rounded-3xl flex flex-col items-center gap-6 animate-pulse">
              <AlertCircle className="w-24 h-24 text-white" />
              <h1 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-widest text-center">
                Please Focus,<br/>Aditya Sir
              </h1>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

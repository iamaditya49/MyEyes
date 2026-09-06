import { GoogleGenAI } from '@google/genai';
import { OcularData } from '../types';

export const VIBE_MAP: Record<string, string> = {
  person: 'ethereal ambient drone, calm',
  'cell phone': 'cyberpunk synthwave, electronic',
  laptop: 'cyberpunk synthwave, electronic',
  tv: 'cyberpunk synthwave, electronic',
  cup: 'coffee shop jazz, chill acoustic',
  bottle: 'coffee shop jazz, chill acoustic',
  bowl: 'coffee shop jazz, chill acoustic',
  cat: 'playful acoustic guitar, happy melody',
  dog: 'playful acoustic guitar, happy melody',
  bird: 'playful acoustic guitar, happy melody',
  car: 'driving rock beat, fast tempo',
  bus: 'driving rock beat, fast tempo',
  truck: 'driving rock beat, fast tempo',
  chair: 'ambient drone, relaxing',
  couch: 'ambient drone, relaxing',
  bed: 'ambient drone, relaxing',
  'potted plant': 'ethereal flute, ambient nature',
  book: 'classical piano, focused',
};

export const EMOTION_VIBE_MAP: Record<string, string> = {
  joy: 'bright upbeat acoustic warmth, joyful melody',
  excitement: 'sparkling celestial synth arpeggios, ecstatic tempo',
  serenity: 'deep warm ambient drone, tranquil peaceful pad',
  awe: 'shimmering ethereal crystals, wide-eyed wonder',
  playfulness: 'playful whimsical acoustic flutter, lighthearted',
  curiosity: 'inquisitive wandering bells, curious exploration',
  focus: 'hypnotic rhythmic pulse, deep concentration',
  surprise: 'sudden crystalline chimes, bright acoustic flutter',
  confusion: 'mysterious shifting tones, inquisitive harmonic drift',
  skepticism: 'subtle off-beat plucks, quirky intriguing atmosphere',
  sadness: 'melancholic piano reflections, sorrowful cello drone',
  anger: 'dark distorted bass tension, driving harmonic pulse',
  fear: 'shivering tense atmospheric tremolo, suspenseful drone',
  disgust: 'hollow low-frequency resonance, astringent texture',
  contempt: 'cynical syncopated synth, detached coolness',
  embarrassment: 'delicate bashful acoustic harmonics, soft intimacy',
  boredom: 'slow drowsy lo-fi hum, lethargic ambient haze',
  neutral: 'minimalist ambient drone, quiet contemplation',
};

export function getVibeForObjectsAndEyes(
  objects: string[],
  emotion: string,
  ocular: OcularData,
  secondaryEmotion?: string | null
): string {
  const vibes: string[] = [];

  // Ocular influence on vibe
  if (ocular.isClosed) {
    return 'deep meditative ambient drone, dreamy tranquility';
  } else if (ocular.wide > 0.28) {
    vibes.push('shimmering celestial crystals, wide-eyed wonder');
  } else if (ocular.isWinkingLeft || ocular.isWinkingRight) {
    vibes.push('playful whimsical acoustic flutter, lighthearted');
  } else if (ocular.squint > 0.35) {
    vibes.push('intimate focused drone, scrutinizing harmonic tension');
  } else if (ocular.gazeDirection === 'LOOKING LEFT' || ocular.gazeDirection === 'LOOKING RIGHT') {
    vibes.push('drifting panoramic stereo ambient, searching atmosphere');
  } else if (ocular.gazeDirection === 'LOOKING UP') {
    vibes.push('ethereal uplifting chimes, contemplative air');
  }

  // Emotion specific vibe
  const emotionKey = emotion.toLowerCase().trim();
  const matchedEmotionVibe = Object.entries(EMOTION_VIBE_MAP).find(([key]) =>
    emotionKey.includes(key)
  );

  if (matchedEmotionVibe) {
    vibes.push(matchedEmotionVibe[1]);
  }

  // Object vibes
  if (objects.length > 0) {
    for (const obj of objects) {
      if (VIBE_MAP[obj]) {
        vibes.push(VIBE_MAP[obj]);
        break;
      }
    }
  }

  if (vibes.length === 0) {
    vibes.push('minimalist ambient drone, focused');
  }

  const emotionSummary = secondaryEmotion ? `${emotion} & ${secondaryEmotion}` : emotion;
  return vibes.slice(0, 2).join(', ') + `, ${emotionSummary} mood`;
}

export const getVibeFromGemini = async (
  objects: string[],
  emotion: string,
  ocular: OcularData,
  secondaryEmotion?: string | null
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
    
    // Construct prompt explicitly giving weight to the ocular and emotion state
    const eyeSummary = `${ocular.eyeStateLabel} (openness: ${Math.round(ocular.averageOpenness * 100)}%, gaze: ${ocular.gazeDirection})`;
    const objectList = objects.length > 0 ? objects.join(', ') : 'none';
    const emotionDetail = secondaryEmotion ? `${emotion} (co-occurring with ${secondaryEmotion})` : emotion;

    const prompt = `You are a generative ambient soundscape composer. Based on this visual scan, synthesize a 3-5 word ambient soundscape description (e.g. 'dreamy meditative drone', 'shimmering wide-eyed crystalline arpeggio', 'curious wandering acoustic chimes', or 'intense focused electronic pulse').
Scene details:
- Emotional affective state: ${emotionDetail}
- Eye & Ocular state: ${eyeSummary}
- Environmental objects: ${objectList}

Rules: Keep it strictly ambient, atmospheric, and evocative. Output only the 3-5 word soundscape description without quotes or extra text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: prompt,
    });

    return response.text?.trim() || getVibeForObjectsAndEyes(objects, emotion, ocular, secondaryEmotion);
  } catch (e: any) {
    console.warn('Gemini API error (falling back to local vibe generator):', e.message || e);
    return getVibeForObjectsAndEyes(objects, emotion, ocular, secondaryEmotion);
  }
};

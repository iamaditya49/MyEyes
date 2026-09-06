# Vision Sync

**Vision Sync** is a real-time ocular biometric tracking and comprehensive 18-emotion affective spectrum analyzer that synthesizes reactive ambient music. By utilizing advanced computer vision, the application tracks facial expressions, environmental objects, and deep eye telemetry to dynamically modulate a procedural audio engine.

## ✨ Features

- **Comprehensive Affective Spectrum (18 States)**: Maps MediaPipe 52-blendshape Facial Action Coding System (FACS) telemetry and ocular metrics into 18 distinct human emotions (e.g., Joy, Awe, Determination, Melancholy) using the 2D Russell Circumplex of Affect (Valence & Arousal).
- **Deep Ocular Biometrics**: Tracks iris gaze vectors, eye openness, squint intensity, blinks, and winks to dynamically shape the audio experience.
- **Procedural Music Engine**: Utilizes Tone.js to generate real-time ambient soundscapes.
  - *Closed eyes* ease the soundscape into a warm meditative drone.
  - *Horizontal gaze* pans ambient reflections across the stereo field.
  - *Vertical gaze* shifts harmonic registers.
  - *Blinks and winks* trigger tonal flourishes.
- **Focus & Study Mode**: 
  - Suppresses ambient drone and synthesizes clean **14Hz Beta wave binaural beats** (200Hz left / 214Hz right) to induce deep concentration.
  - Continuously monitors gaze and attention. Triggers visual and auditory alerts ("Please focus, Aditya Sir") if distraction is detected.
- **AI Integration**: Leverages the Gemini API to continuously adapt ambient prompts and the procedural synthesizer's vibe based on current environmental objects and the user's affective state.
- **Futuristic HUD & Telemetry**: Renders live orbital eyelid contours, iris markers, and a real-time emotion matrix directly onto the biometric viewfinder.

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Motion (React)
- **Computer Vision**: TensorFlow.js (COCO-SSD), MediaPipe Tasks Vision (FaceLandmarker)
- **Audio & Synthesis**: Tone.js, Web Audio API, Web Speech API
- **AI Integration**: Google GenAI SDK (`@google/genai`)

## 🚀 Getting Started

### Prerequisites

You need Node.js installed to run the development server.

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd vision-sync
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env` file in the root directory and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to the provided localhost URL (typically `http://localhost:3000`).

## 🔒 Privacy Note

All computer vision (face mesh mapping, object detection, ocular tracking) and procedural audio synthesis execute strictly **locally within your browser**. No video or image data is ever saved or transmitted to external servers.

## 📝 License

MIT License


import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// --- Constants & Types ---
const MAX_HISTORY = 50;
const CANVAS_SIZE = { width: 600, height: 400 };

interface Species {
  name: string;
  flickerRate: number; // Hz (Updates per second)
  integrationWindow: number; // How many past frames contribute to current "meaning"
  attentionFocus: number; // Gradient of attention back into history
  spectralSensitivity: string; // Visual aesthetic
}

const SPECIES_PRESETS: Record<string, Species> = {
  "Dragonfly": {
    name: "Dragonfly",
    flickerRate: 200,
    integrationWindow: 5,
    attentionFocus: 0.1,
    spectralSensitivity: "#00ffcc"
  },
  "Bird": {
    name: "Bird",
    flickerRate: 80,
    integrationWindow: 15,
    attentionFocus: 0.4,
    spectralSensitivity: "#ff00ff"
  },
  "Human": {
    name: "Human",
    flickerRate: 24,
    integrationWindow: 30,
    attentionFocus: 0.7,
    spectralSensitivity: "#ffffff"
  },
  "Species-AI": {
    name: "Species-AI",
    flickerRate: 8,
    integrationWindow: 50,
    attentionFocus: 0.95,
    spectralSensitivity: "#ffff00"
  }
};

const PRESET_KEYS = Object.keys(SPECIES_PRESETS);

// --- Helper Components ---
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div 
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div style={{
          position: 'absolute',
          bottom: '125%',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#1a1a1a',
          color: '#00ffcc',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '0.65rem',
          lineHeight: '1.4',
          width: '200px',
          zIndex: 1000,
          border: '1px solid #00ffcc',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
          textAlign: 'center'
        }}>
          {text}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            marginLeft: '-5px',
            borderWidth: '5px',
            borderStyle: 'solid',
            borderColor: '#00ffcc transparent transparent transparent'
          }} />
        </div>
      )}
    </div>
  );
};

// --- Utilities ---
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const TransparencyLoop: React.FC = () => {
  const [species, setSpecies] = useState<Species>(SPECIES_PRESETS["Human"]);
  const [history, setHistory] = useState<{ x: number; y: number; t: number }[]>([]);
  const [transparency, setTransparency] = useState(0);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const worldCanvasRef = useRef<HTMLCanvasElement>(null);
  const modelCanvasRef = useRef<HTMLCanvasElement>(null);
  const matrixCanvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const lastUpdateTime = useRef<number>(0);

  const worldState = useRef({ x: 150, y: 100, targetX: 150, targetY: 100 });

  const cycleSpecies = () => {
    const currentIndex = PRESET_KEYS.indexOf(species.name);
    const nextIndex = (currentIndex + 1) % PRESET_KEYS.length;
    setSpecies(SPECIES_PRESETS[PRESET_KEYS[nextIndex]]);
    setAnalysis(null);
  };

  const updateWorld = () => {
    const ws = worldState.current;
    if (Math.random() > 0.97) {
      ws.targetX = Math.random() * (CANVAS_SIZE.width / 2);
      ws.targetY = Math.random() * (CANVAS_SIZE.height / 2);
    }
    ws.x = lerp(ws.x, ws.targetX, 0.05);
    ws.y = lerp(ws.y, ws.targetY, 0.05);
  };

  const performDeepAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `You are a Computational Neuro-Phenomenologist. Perform a rigorous analysis of the "Umwelt" (subjective reality) for a cognitive agent with these specific system constraints:

SPECIFICATIONS:
- Identity: ${species.name}
- Temporal Resolution (Flicker Rate): ${species.flickerRate} Hz (sampling frequency)
- Contextual Depth (Integration Window): ${species.integrationWindow} frames (memory buffer)
- Causal Saliency (Attention Bias): ${species.attentionFocus.toFixed(2)} (recency weighting)
- Phenomenal Transparency: ${transparency.toFixed(1)}% (model-reality convergence)

ANALYSIS REQUIREMENTS:
1. Temporal Grain: How does the ${species.flickerRate}Hz sampling rate impact the agent's perception of continuity? Does reality appear as a fluid stream or a series of discrete, aliased snapshots?
2. Integration & Coherence: With a window of ${species.integrationWindow}, how "thick" is the agent's present moment? Does the past overwhelm the "now," or is the agent trapped in a vanishingly thin sliver of time?
3. The Transparency Threshold: Given a Transparency Index of ${transparency.toFixed(1)}%, apply Thomas Metzinger’s "Self-Model Theory." Is the internal world-model so efficient it has become "invisible" (transparent), or is the agent acutely aware of the "lag" (opacity) in their construction of reality?
4. Attention Bias: Explain how a bias of ${species.attentionFocus.toFixed(2)} affects their sense of agency. Are they a creature of immediate reaction or deep reflection?

Keep your tone evocative, philosophical, and scientifically grounded.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 32768 }
        }
      });

      setAnalysis(response.text || "Insight unavailable at this resolution.");
    } catch (error) {
      console.error("Analysis failed:", error);
      setAnalysis("Perceptual static detected. Intelligence link severed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const animate = (time: number) => {
    const delta = time - lastUpdateTime.current;
    const interval = 1000 / species.flickerRate;

    updateWorld();

    if (delta > interval) {
      lastUpdateTime.current = time;

      setHistory(prev => {
        const newPoint = { x: worldState.current.x, y: worldState.current.y, t: time };
        const updated = [...prev, newPoint].slice(-MAX_HISTORY);
        return updated;
      });

      if (history.length > 1) {
        const last = history[history.length - 1];
        const prev = history[history.length - 2];
        const dist = Math.sqrt(Math.pow(last.x - prev.x, 2) + Math.pow(last.y - prev.y, 2));
        const currentTransparency = Math.max(0, Math.min(100, 100 - (dist / (species.flickerRate / 5))));
        setTransparency(prevT => lerp(prevT, currentTransparency, 0.1));
      }
    }

    drawCanvases();
    requestRef.current = requestAnimationFrame(animate);
  };

  const drawCanvases = () => {
    const worldCtx = worldCanvasRef.current?.getContext('2d');
    const modelCtx = modelCanvasRef.current?.getContext('2d');
    const matrixCtx = matrixCanvasRef.current?.getContext('2d');

    if (!worldCtx || !modelCtx || !matrixCtx) return;

    const w = CANVAS_SIZE.width / 2;
    const h = CANVAS_SIZE.height / 2;

    worldCtx.fillStyle = '#0a0a0a';
    worldCtx.fillRect(0, 0, w, h);
    worldCtx.beginPath();
    worldCtx.arc(worldState.current.x, worldState.current.y, 6, 0, Math.PI * 2);
    worldCtx.fillStyle = '#444';
    worldCtx.fill();
    worldCtx.strokeStyle = '#666';
    worldCtx.stroke();

    modelCtx.fillStyle = '#0a0a0a';
    modelCtx.fillRect(0, 0, w, h);
    
    const windowPoints = history.slice(-species.integrationWindow);
    windowPoints.forEach((p, i) => {
      const alpha = (i / windowPoints.length) * 0.8;
      modelCtx.beginPath();
      modelCtx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      modelCtx.fillStyle = `${species.spectralSensitivity}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
      modelCtx.fill();
    });

    const mSize = 150;
    matrixCtx.fillStyle = '#000';
    matrixCtx.fillRect(0, 0, mSize, mSize);
    
    const count = Math.max(1, history.length);
    const blockSize = mSize / MAX_HISTORY;
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (col <= row) {
          const recency = 1 - (row - col) / MAX_HISTORY;
          const attentionStrength = Math.pow(recency, (1.05 - species.attentionFocus) * 10);
          matrixCtx.fillStyle = `rgba(0, 255, 204, ${attentionStrength * 0.8})`;
          matrixCtx.fillRect(col * blockSize, row * blockSize, blockSize, blockSize);
        }
      }
    }
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [species, history]);

  return (
    <div style={{
      backgroundColor: '#050505',
      color: '#00ffcc',
      minHeight: '100vh',
      fontFamily: '"JetBrains Mono", monospace',
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <header style={{ 
        width: '100%', 
        maxWidth: '1100px', 
        marginBottom: '30px', 
        borderBottom: '1px solid #333', 
        paddingBottom: '15px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end'
      }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0, letterSpacing: '2px' }}>THE TRANSPARENCY LOOP</h1>
          <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '5px' }}>Simulating Causal Attention & Flicker Fusion Convergence</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={performDeepAnalysis}
            disabled={isAnalyzing}
            style={{
              backgroundColor: isAnalyzing ? '#222' : 'transparent',
              color: isAnalyzing ? '#444' : '#ffaa00',
              border: `1px solid ${isAnalyzing ? '#444' : '#ffaa00'}`,
              padding: '8px 16px',
              fontSize: '0.7rem',
              cursor: isAnalyzing ? 'wait' : 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
            }}
          >
            {isAnalyzing ? 'Thinking...' : 'Analyze Consciousness'}
          </button>
          <button
            onClick={cycleSpecies}
            style={{
              backgroundColor: 'transparent',
              color: '#00ffcc',
              border: '1px solid #00ffcc',
              padding: '8px 16px',
              fontSize: '0.7rem',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLElement;
              target.style.backgroundColor = '#00ffcc';
              target.style.color = '#000';
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLElement;
              target.style.backgroundColor = 'transparent';
              target.style.color = '#00ffcc';
            }}
          >
            Cycle Species
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '30px', width: '100%', maxWidth: '1100px' }}>
        
        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ border: '1px solid #333', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', fontSize: '0.65rem', backgroundColor: '#111', borderBottom: '1px solid #333', color: '#888' }}>HIDDEN STATE (REALITY)</div>
              <canvas ref={worldCanvasRef} width={CANVAS_SIZE.width / 2} height={CANVAS_SIZE.height / 2} style={{ width: '100%', display: 'block' }} />
            </div>
            <div style={{ border: '1px solid #333', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', fontSize: '0.65rem', backgroundColor: '#111', borderBottom: '1px solid #333', color: '#888' }}>
                INFERRED MODEL ({species.name})
              </div>
              <canvas ref={modelCanvasRef} width={CANVAS_SIZE.width / 2} height={CANVAS_SIZE.height / 2} style={{ width: '100%', display: 'block' }} />
            </div>
          </div>

          <div style={{ backgroundColor: '#0a0a0a', padding: '25px', border: '1px solid #333', borderRadius: '4px' }}>
            <h3 style={{ fontSize: '0.85rem', marginBottom: '20px', letterSpacing: '1px' }}>CAUSAL ATTENTION MATRIX</h3>
            <div style={{ display: 'flex', gap: '25px', alignItems: 'flex-start' }}>
              <canvas ref={matrixCanvasRef} width={150} height={150} style={{ border: '1px solid #444', background: '#000' }} />
              <div style={{ fontSize: '0.75rem', lineHeight: '1.6' }}>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ color: '#888' }}>TOKEN BUFFER:</span> {history.length}/{MAX_HISTORY}<br />
                  <Tooltip text="The number of past frames the agent uses to construct current meaning. Longer windows allow for deeper context but can introduce temporal lag.">
                    <span style={{ color: '#888', borderBottom: '1px dotted #888', cursor: 'help' }}>INTEGRATION:</span>
                  </Tooltip> {species.integrationWindow} units
                </div>
                <Tooltip text="Measures how seamlessly the agent's internal model aligns with reality. Higher values indicate 'phase-locking' where the model becomes transparent.">
                  <div style={{ 
                    padding: '10px', 
                    border: '1px solid #222', 
                    backgroundColor: '#050505',
                    color: transparency > 80 ? '#00ffcc' : '#ff3366',
                    cursor: 'help'
                  }}>
                    <div style={{ fontSize: '0.6rem', color: '#666', marginBottom: '2px' }}>TRANSPARENCY INDEX</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{transparency.toFixed(1)}%</div>
                    <div style={{ fontSize: '0.6rem' }}>{transparency > 80 ? 'PHASE-LOCKED' : 'PHENOMENAL LAG'}</div>
                  </div>
                </Tooltip>
              </div>
            </div>
          </div>

          {analysis && (
            <div style={{ 
              backgroundColor: '#111', 
              padding: '20px', 
              border: '1px solid #ffaa00', 
              borderRadius: '4px',
              marginTop: '10px',
              animation: 'fadeIn 0.5s ease-out',
              boxShadow: '0 0 20px rgba(255, 170, 0, 0.1)'
            }}>
              <h4 style={{ fontSize: '0.7rem', color: '#ffaa00', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Phenomenological Insight</h4>
              <div style={{ 
                fontSize: '0.8rem', 
                color: '#ddd', 
                lineHeight: '1.7', 
                whiteSpace: 'pre-wrap',
                fontStyle: 'italic',
                fontFamily: 'serif'
              }}>
                {analysis}
              </div>
            </div>
          )}
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: '#111', padding: '20px', border: '1px solid #333', borderRadius: '4px' }}>
            <h3 style={{ fontSize: '0.75rem', marginBottom: '15px', color: '#666', textTransform: 'uppercase' }}>Perceptual Presets</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {PRESET_KEYS.map(key => (
                <button
                  key={key}
                  onClick={() => {
                    setSpecies(SPECIES_PRESETS[key]);
                    setAnalysis(null);
                  }}
                  style={{
                    backgroundColor: species.name === key ? '#00ffcc' : 'transparent',
                    color: species.name === key ? '#000' : '#00ffcc',
                    border: '1px solid #00ffcc',
                    padding: '10px',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {key.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ backgroundColor: '#111', padding: '20px', border: '1px solid #333', borderRadius: '4px' }}>
            <h3 style={{ fontSize: '0.75rem', marginBottom: '15px', color: '#666', textTransform: 'uppercase' }}>Fine Tuning</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '0.6rem', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>FLICKER RATE</span>
                  <span style={{ color: '#00ffcc' }}>{species.flickerRate} Hz</span>
                </label>
                <input 
                  type="range" min="1" max="240" step="1" 
                  value={species.flickerRate} 
                  onChange={(e) => setSpecies(s => ({...s, flickerRate: parseInt(e.target.value)}))}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.6rem', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>INTEGRATION WINDOW</span>
                  <span style={{ color: '#00ffcc' }}>{species.integrationWindow}</span>
                </label>
                <input 
                  type="range" min="1" max="50" step="1" 
                  value={species.integrationWindow} 
                  onChange={(e) => setSpecies(s => ({...s, integrationWindow: parseInt(e.target.value)}))}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <Tooltip text="Controls the weighting of historical data. High bias prioritizes the most recent frames, while low bias creates a more distributed focus across time.">
                  <label style={{ fontSize: '0.6rem', display: 'flex', justifyContent: 'space-between', marginBottom: '8px', cursor: 'help' }}>
                    <span style={{ borderBottom: '1px dotted #666' }}>ATTENTION BIAS</span>
                    <span style={{ color: '#00ffcc' }}>{species.attentionFocus.toFixed(2)}</span>
                  </label>
                </Tooltip>
                <input 
                  type="range" min="0" max="1" step="0.01" 
                  value={species.attentionFocus} 
                  onChange={(e) => setSpecies(s => ({...s, attentionFocus: parseFloat(e.target.value)}))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '15px', 
            padding: '15px', 
            border: '1px solid #222', 
            borderRadius: '4px',
            backgroundColor: '#0a0a0a'
          }}>
            <div 
              className="flicker-pulse"
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: species.spectralSensitivity,
                boxShadow: `0 0 10px ${species.spectralSensitivity}`,
                animation: `flicker ${1000/species.flickerRate}ms infinite alternate ease-in-out`
              }}
            />
            <span style={{ fontSize: '0.6rem', color: '#666', letterSpacing: '1px' }}>SYSTEM CLOCK SYNC</span>
          </div>
        </aside>
      </div>

      <style>{`
        @keyframes flicker {
          from { opacity: 0.2; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1.2); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        input[type=range] {
          appearance: none;
          background: #222;
          height: 4px;
          border-radius: 2px;
          outline: none;
        }
        input[type=range]::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          background: #00ffcc;
          border-radius: 50%;
          cursor: pointer;
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed !important;
        }
      `}</style>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<TransparencyLoop />);
}

export default TransparencyLoop;

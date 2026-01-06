export type TransmissionMode = "digital-to-digital" | "digital-to-analog" | "analog-to-digital" | "analog-to-analog";

// --- Constants ---
const SAMPLES_PER_BIT = 10;
const CARRIER_FREQ = 2;

// --- Helper Functions ---
const parseBits = (data: string): number[] => data.split("").map((b) => parseInt(b, 10));

const parseAnalog = (data: string): number[] => {
  const cleaned = data.replace(/["“”]/g, "");
  const matches = cleaned.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || [];
  return matches.map((m) => parseFloat(m)).filter((v) => !Number.isNaN(v));
}

interface TransmissionResult {
  original?: string
  originalAnalog?: number[]
  encoded?: number[]
  decoded?: string
  decodedAnalog?: number[]
  modulated?: number[]
  demodulated?: number[]
  demodulatedSignal?: number[]
  metrics?: {
    bitRate: string
    signalLevels: string
    bandwidth: string
  }
}

// --- Main Process ---
export function processTransmission(mode: TransmissionMode, algorithm: string, inputData: string): TransmissionResult | null {
  const processors: Record<TransmissionMode, (algo: string, data: string) => TransmissionResult> = {
    "digital-to-digital": processDigitalToDigital,
    "digital-to-analog": processDigitalToAnalog,
    "analog-to-digital": processAnalogToDigital,
    "analog-to-analog": processAnalogToAnalog,
  };

  const processor = processors[mode];
  return processor ? processor(algorithm, inputData) : null;
}

// --- 1. Digital to Digital ---
function processDigitalToDigital(algorithm: string, data: string) {
  const bits = parseBits(data);

  // Encoding Logic Map
  const encoders: Record<string, (bits: number[]) => number[]> = {
    "nrz-l": (b) => [...b],
    "nrz-i": (b) => {
      let level = 0;
      return b.map((bit, idx) => {
        if (idx === 0) {
          level = bit;
        } else {
          if (bit === 1) level = 1 - level;
        }
        return level;
      });
    },
    "manchester": (b) => b.flatMap(bit => (bit === 1 ? [0, 1] : [1, 0])),
    "diff-manchester": (b) => {
      let level = 0;
      return b.flatMap(bit => {
        if (bit === 0) level = 1 - level;
        const start = level;
        level = 1 - level;
        const mid = level;
        return [start, mid];
      });
    },
    "ami": (b) => {
      let polarity = 1;
      return b.map(bit => {
        if (bit === 1) {
          const val = polarity;
          polarity = -polarity;
          return val;
        }
        return 0;
      });
    }
  };

  // Decoding Logic Map
  const decoders: Record<string, (encoded: number[], originalBits?: number[]) => string> = {
    "nrz-l": (enc) => enc.map(Math.round).join(""),
    "nrz-i": (enc) => {
      const decodedBits = [enc[0]];
      for (let i = 1; i < enc.length; i++) {
        decodedBits.push(enc[i] !== enc[i - 1] ? 1 : 0);
      }
      return decodedBits.join("");
    },
    "manchester": (enc) => {
      let res = "";
      for (let i = 0; i < enc.length; i += 2) {
        res += (enc[i] === 0 && enc[i + 1] === 1) ? "1" : "0";
      }
      return res;
    },
    "diff-manchester": (enc) => {
      let res = "";
      let prevLevel = 0;
      for (let i = 0; i < enc.length; i += 2) {
        const start = enc[i];
        res += start !== prevLevel ? "0" : "1";
        const mid = enc[i + 1];
        prevLevel = mid;
      }
      return res;
    },
    "ami": (enc) => enc.map(e => (e === 0 ? 0 : 1)).join("")
  };

  const encodeFn = encoders[algorithm] || encoders["nrz-l"];
  const encoded = encodeFn(bits);

  const decodeFn = decoders[algorithm] || ((enc) => enc.join(""));
  const decoded = decodeFn(encoded);

  return {
    original: data,
    encoded,
    decoded,
    metrics: {
      bitRate: `${data.length * 1000} bps`,
      signalLevels: algorithm === "ami" ? "3" : "2",
      bandwidth: `${data.length * 500} Hz`,
    },
  };
}

// --- 2. Digital to Analog ---
function processDigitalToAnalog(algorithm: string, data: string) {
  const bits = parseBits(data);
  
  // Wave Generation Utility
  const generateWave = (callback: (i: number) => number) => 
    Array.from({ length: SAMPLES_PER_BIT }, (_, i) => callback(i));

  const strategies: Record<string, (bit: number, idx: number) => number[]> = {
    "ask": (bit) => generateWave(() => (bit === 1 ? 1 : 0.3)),
    "fsk": (bit) => {
      const freq = bit === 1 ? 4 : 2;
      return generateWave((i) => Math.sin((2 * Math.PI * freq * i) / SAMPLES_PER_BIT));
    },
    "psk": (bit) => 
      generateWave((i) => Math.sin((2 * Math.PI * CARRIER_FREQ * i) / SAMPLES_PER_BIT + (bit === 1 ? Math.PI : 0))),
    "qam": (bit) => 
      generateWave((i) => {
        const base = Math.sin((2 * Math.PI * CARRIER_FREQ * i) / SAMPLES_PER_BIT);
        return bit === 1 ? base * 1.5 : base * 0.5;
      }),
  };

  const strategy = strategies[algorithm] || ((bit) => generateWave(() => bit));
  const modulated = bits.flatMap((bit, idx) => strategy(bit, idx));

  let demodulated = ""
  for (let i = 0; i < modulated.length; i += SAMPLES_PER_BIT) {
    const segment = modulated.slice(i, i + SAMPLES_PER_BIT)
    const avg = segment.reduce((a, b) => a + Math.abs(b), 0) / segment.length

    if (algorithm === "ask") {
      demodulated += avg > 0.6 ? "1" : "0"
    } else if (algorithm === "fsk") {
      const highFreq = segment.filter((_, idx) => idx > 0 && Math.abs(segment[idx] - segment[idx - 1]) > 0.5).length
      demodulated += highFreq > 3 ? "1" : "0"
    } else if (algorithm === "psk") {
      demodulated += segment[0] < 0 ? "1" : "0"
    } else if (algorithm === "qam") {
      demodulated += avg > 0.8 ? "1" : "0"
    } else {
      demodulated += avg > 0.5 ? "1" : "0"
    }
  }

  return {
    original: data,
    encoded: modulated,
    decoded: demodulated,
    metrics: {
      bitRate: `${data.length * 1000} bps`,
      signalLevels: algorithm === "qam" ? "16" : algorithm === "psk" ? "4" : "2",
      bandwidth: `${data.length * 2000} Hz`,
    },
  };
}

// --- 3. Analog to Digital ---
function processAnalogToDigital(algorithm: string, data: string) {
  const analogValues = parseAnalog(data);

  let encoded: number[] = [];
  let decoded: number[] = [];

  // Strategy Pattern for Encoding/Decoding pairs
  if (algorithm === "pcm") {
    // 8-level quantization
    encoded = analogValues.map((v) => Math.round(v * 7) / 7);
    decoded = [...encoded]; // PCM decode is effectively reading the quantized value
  } else if (algorithm === "delta" || algorithm === "adaptive-delta") {
    // Delta Modulation
    encoded = [analogValues[0]]; // Initial value logic preserved
    for (let i = 1; i < analogValues.length; i++) {
      encoded.push(analogValues[i] - analogValues[i - 1] > 0 ? 1 : 0);
    }
    
    // Decoding Delta
    decoded = [encoded[0]];
    for (let i = 1; i < encoded.length; i++) {
      const step = encoded[i] === 1 ? 0.1 : -0.1;
      decoded.push(decoded[i - 1] + step);
    }
  } else {
    // Default / Bypass
    encoded = [...analogValues];
    decoded = [...analogValues];
  }

  return {
    originalAnalog: analogValues,
    encoded,
    decodedAnalog: decoded,
    metrics: {
      bitRate: `${analogValues.length * 8000} bps`,
      signalLevels: "256",
      bandwidth: `${analogValues.length * 4000} Hz`,
    },
  };
}

// --- 4. Analog to Analog ---
function processAnalogToAnalog(algorithm: string, data: string) {
  const analogValues = parseAnalog(data);

  const SAMPLES = 20;
  let modulated: number[];
  let demodulated: number[];

  switch (algorithm) {
    case "am":
      modulated = analogValues.flatMap((v) =>
        Array.from({ length: SAMPLES }, (_, i) => v * (1 + 0.5 * Math.sin((2 * Math.PI * i) / SAMPLES)))
      );
      demodulated = []
      for (let i = 0; i < modulated.length; i += SAMPLES) {
        const segment = modulated.slice(i, i + SAMPLES)
        const envelope = segment.reduce((sum, val) => sum + Math.abs(val), 0) / SAMPLES
        demodulated.push(envelope / 1.5)
      }
      break;
    case "fm":
      modulated = analogValues.flatMap((v) => {
        const freq = 2 + Math.abs(v);
        return Array.from({ length: SAMPLES }, (_, i) => Math.sin((2 * Math.PI * freq * i) / SAMPLES));
      });
      demodulated = []
      for (let i = 0; i < modulated.length; i += SAMPLES) {
        const segment = modulated.slice(i, i + SAMPLES)
        let zeroCrossings = 0
        for (let j = 1; j < segment.length; j++) {
          if ((segment[j - 1] >= 0 && segment[j] < 0) || (segment[j - 1] < 0 && segment[j] >= 0)) {
            zeroCrossings++
          }
        }
        const freq = zeroCrossings / 2
        demodulated.push(freq - 2)
      }
      break;
    case "pm":
      modulated = analogValues.flatMap((v) =>
        Array.from({ length: SAMPLES }, (_, i) => Math.sin((2 * Math.PI * 2 * i) / SAMPLES + v))
      );
      demodulated = []
      for (let i = 0; i < modulated.length; i += SAMPLES) {
        const segment = modulated.slice(i, i + SAMPLES)
        const phase = Math.atan2(segment[SAMPLES / 4] || 0, segment[0] || 1)
        demodulated.push(phase)
      }
      break;
    default:
      modulated = analogValues;
      demodulated = analogValues;
  }

  return {
    originalAnalog: analogValues,
    encoded: modulated,
    decodedAnalog: analogValues,
    demodulatedSignal: demodulated,
    metrics: {
      bitRate: "N/A (Analog)",
      signalLevels: "Continuous",
      bandwidth: `${analogValues.length * 1000} Hz`,
    },
  };
}

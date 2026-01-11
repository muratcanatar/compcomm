// ============================================================
// OPTIMIZED TRANSMISSION LIBRARY - GEMINI VERSION
// High-performance signal processing with functional approach
// ============================================================

export type TransmissionMode = "digital-to-digital" | "digital-to-analog" | "analog-to-digital" | "analog-to-analog"

// --- Constants ---
const SAMPLES_PER_BIT = 10
const CARRIER_FREQ = 2
const ANALOG_SAMPLES = 20
const PCM_LEVELS = 256

// --- Utility Functions ---
const parseBits = (data: string): number[] =>
  data.split("").map(b => parseInt(b, 10))

const parseAnalog = (data: string): number[] => {
  const cleaned = data.replace(/["""„‟‹›«»'`]/g, "")
  const matches = cleaned.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []
  return matches.map(Number).filter(v => !Number.isNaN(v))
}

const generateWave = (length: number, fn: (i: number) => number): number[] =>
  Array.from({ length }, (_, i) => fn(i))

const countZeroCrossings = (segment: number[]): number => {
  let count = 0
  for (let i = 1; i < segment.length; i++) {
    if ((segment[i - 1] >= 0 && segment[i] < 0) || (segment[i - 1] < 0 && segment[i] >= 0)) {
      count++
    }
  }
  return count
}

// --- Result Interface ---
interface TransmissionResult {
  original?: string
  originalAnalog?: number[]
  encoded: number[]
  decoded?: string
  decodedAnalog?: number[]
  demodulatedSignal?: number[]
  metrics: {
    bitRate: string
    signalLevels: string
    bandwidth: string
  }
}

// --- Main Processor ---
export function processTransmission(
  mode: TransmissionMode,
  algorithm: string,
  inputData: string
): TransmissionResult | null {
  const processors: Record<TransmissionMode, (algo: string, data: string) => TransmissionResult> = {
    "digital-to-digital": processDigitalToDigital,
    "digital-to-analog": processDigitalToAnalog,
    "analog-to-digital": processAnalogToDigital,
    "analog-to-analog": processAnalogToAnalog,
  }
  return processors[mode]?.(algorithm, inputData) ?? null
}

// ============================================================
// 1. DIGITAL TO DIGITAL
// ============================================================
function processDigitalToDigital(algorithm: string, data: string): TransmissionResult {
  const bits = parseBits(data)

  // Encoding strategies
  const encode = (): number[] => {
    switch (algorithm) {
      case "nrz-l":
        return [...bits]

      case "nrz-i": {
        const result: number[] = []
        let level = 0
        bits.forEach(b => {
          if (b === 1) level = 1 - level
          result.push(level)
        })
        return result
      }

      case "manchester":
        return bits.flatMap(b => b === 1 ? [0, 1] : [1, 0])

      case "diff-manchester": {
        const result: number[] = []
        let level = 0
        bits.forEach(b => {
          if (b === 0) level = 1 - level
          result.push(level)
          level = 1 - level
          result.push(level)
        })
        return result
      }

      case "ami": {
        let polarity = 1
        return bits.map(b => {
          if (b === 1) {
            const val = polarity
            polarity = -polarity
            return val
          }
          return 0
        })
      }

      default:
        return [...bits]
    }
  }

  const encoded = encode()

  // Decoding strategies
  const decode = (): string => {
    switch (algorithm) {
      case "nrz-l":
        return encoded.map(Math.round).join("")

      case "nrz-i": {
        const result = [encoded[0]]
        for (let i = 1; i < encoded.length; i++) {
          result.push(encoded[i] !== encoded[i - 1] ? 1 : 0)
        }
        return result.join("")
      }

      case "manchester": {
        let result = ""
        for (let i = 0; i < encoded.length; i += 2) {
          result += (encoded[i] === 0 && encoded[i + 1] === 1) ? "1" : "0"
        }
        return result
      }

      case "diff-manchester": {
        let result = ""
        let prevLevel = 0
        for (let i = 0; i < encoded.length; i += 2) {
          result += encoded[i] !== prevLevel ? "0" : "1"
          prevLevel = encoded[i + 1]
        }
        return result
      }

      case "ami":
        return encoded.map(e => e === 0 ? "0" : "1").join("")

      default:
        return data
    }
  }

  return {
    original: data,
    encoded,
    decoded: decode(),
    metrics: {
      bitRate: `${data.length * 1000} bps`,
      signalLevels: algorithm === "ami" ? "3" : "2",
      bandwidth: `${data.length * 500} Hz`,
    },
  }
}

// ============================================================
// 2. DIGITAL TO ANALOG
// ============================================================
function processDigitalToAnalog(algorithm: string, data: string): TransmissionResult {
  const bits = parseBits(data)

  // Modulation strategies
  const modulate = (): number[] => {
    switch (algorithm) {
      case "ask":
        return bits.flatMap(b => generateWave(SAMPLES_PER_BIT, () => b === 1 ? 1 : 0.3))

      case "fsk":
        return bits.flatMap(b => {
          const freq = b === 1 ? 4 : 2
          return generateWave(SAMPLES_PER_BIT, i => Math.sin((2 * Math.PI * freq * i) / SAMPLES_PER_BIT))
        })

      case "psk":
        return bits.flatMap(b =>
          generateWave(SAMPLES_PER_BIT, i =>
            Math.sin((2 * Math.PI * CARRIER_FREQ * i) / SAMPLES_PER_BIT + (b === 1 ? Math.PI : 0))
          )
        )

      case "qam":
        return bits.flatMap(b =>
          generateWave(SAMPLES_PER_BIT, i =>
            Math.sin((2 * Math.PI * CARRIER_FREQ * i) / SAMPLES_PER_BIT) * (b === 1 ? 1.5 : 0.5)
          )
        )

      default:
        return bits.flatMap(b => generateWave(SAMPLES_PER_BIT, () => b))
    }
  }

  const modulated = modulate()

  // Demodulation
  const demodulate = (): string => {
    let result = ""
    for (let i = 0; i < modulated.length; i += SAMPLES_PER_BIT) {
      const segment = modulated.slice(i, i + SAMPLES_PER_BIT)
      const avg = segment.reduce((a, b) => a + Math.abs(b), 0) / segment.length

      switch (algorithm) {
        case "ask":
          result += avg > 0.6 ? "1" : "0"
          break

        case "fsk":
          result += countZeroCrossings(segment) >= 6 ? "1" : "0"
          break

        case "psk": {
          let correlation = 0
          for (let j = 0; j < segment.length; j++) {
            correlation += segment[j] * Math.sin((2 * Math.PI * CARRIER_FREQ * j) / SAMPLES_PER_BIT)
          }
          result += correlation < 0 ? "1" : "0"
          break
        }

        case "qam":
          result += avg > 0.8 ? "1" : "0"
          break

        default:
          result += avg > 0.5 ? "1" : "0"
      }
    }
    return result
  }

  return {
    original: data,
    encoded: modulated,
    decoded: demodulate(),
    metrics: {
      bitRate: `${data.length * 1000} bps`,
      signalLevels: algorithm === "qam" ? "16" : algorithm === "psk" ? "4" : "2",
      bandwidth: `${data.length * 2000} Hz`,
    },
  }
}

// ============================================================
// 3. ANALOG TO DIGITAL
// ============================================================
function processAnalogToDigital(algorithm: string, data: string): TransmissionResult {
  const analogValues = parseAnalog(data)

  if (analogValues.length === 0) {
    return {
      originalAnalog: [],
      encoded: [],
      decodedAnalog: [],
      metrics: { bitRate: "0 bps", signalLevels: "256", bandwidth: "0 Hz" },
    }
  }

  const minVal = Math.min(...analogValues)
  const maxVal = Math.max(...analogValues)
  const range = maxVal - minVal || 1
  const normalized = analogValues.map(v => (v - minVal) / range)

  let encoded: number[]
  let decoded: number[]

  switch (algorithm) {
    case "pcm": {
      encoded = normalized.map(v => Math.round(v * (PCM_LEVELS - 1)))
      decoded = encoded.map(v => (v / (PCM_LEVELS - 1)) * range + minVal)
      break
    }

    case "delta":
    case "adaptive-delta": {
      encoded = []
      decoded = [analogValues[0]]

      for (let i = 1; i < analogValues.length; i++) {
        const diff = analogValues[i] - analogValues[i - 1]
        encoded.push(diff >= 0 ? 1 : 0)
        const step = Math.abs(diff)
        decoded.push(decoded[decoded.length - 1] + (diff >= 0 ? step : -step))
      }
      break
    }

    default:
      encoded = [...analogValues]
      decoded = [...analogValues]
  }

  return {
    originalAnalog: analogValues,
    encoded,
    decodedAnalog: decoded,
    metrics: {
      bitRate: `${analogValues.length * 8000} bps`,
      signalLevels: algorithm === "pcm" ? "256" : "2",
      bandwidth: `${analogValues.length * 4000} Hz`,
    },
  }
}

// ============================================================
// 4. ANALOG TO ANALOG
// ============================================================
function processAnalogToAnalog(algorithm: string, data: string): TransmissionResult {
  const analogValues = parseAnalog(data)

  if (analogValues.length === 0) {
    return {
      originalAnalog: [],
      encoded: [],
      decodedAnalog: [],
      demodulatedSignal: [],
      metrics: { bitRate: "N/A (Analog)", signalLevels: "Continuous", bandwidth: "0 Hz" },
    }
  }

  let modulated: number[]
  let demodulated: number[]

  switch (algorithm) {
    case "am":
      modulated = analogValues.flatMap(v =>
        generateWave(ANALOG_SAMPLES, i => v * (1 + 0.5 * Math.sin((2 * Math.PI * i) / ANALOG_SAMPLES)))
      )
      demodulated = []
      for (let i = 0; i < modulated.length; i += ANALOG_SAMPLES) {
        const segment = modulated.slice(i, i + ANALOG_SAMPLES)
        const envelope = segment.reduce((sum, val) => sum + Math.abs(val), 0) / ANALOG_SAMPLES
        demodulated.push(envelope / 1.5)
      }
      break

    case "fm":
      modulated = analogValues.flatMap(v => {
        const freq = 2 + Math.abs(v)
        return generateWave(ANALOG_SAMPLES, i => Math.sin((2 * Math.PI * freq * i) / ANALOG_SAMPLES))
      })
      demodulated = []
      for (let i = 0; i < modulated.length; i += ANALOG_SAMPLES) {
        const segment = modulated.slice(i, i + ANALOG_SAMPLES)
        demodulated.push(countZeroCrossings(segment) / 2 - 2)
      }
      break

    case "pm":
      modulated = analogValues.flatMap(v =>
        generateWave(ANALOG_SAMPLES, i => Math.sin((2 * Math.PI * 2 * i) / ANALOG_SAMPLES + v))
      )
      demodulated = []
      for (let i = 0; i < modulated.length; i += ANALOG_SAMPLES) {
        const segment = modulated.slice(i, i + ANALOG_SAMPLES)
        demodulated.push(Math.atan2(segment[ANALOG_SAMPLES / 4] || 0, segment[0] || 1))
      }
      break

    default:
      modulated = [...analogValues]
      demodulated = [...analogValues]
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
  }
}

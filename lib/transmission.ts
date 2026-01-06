type TransmissionMode = "digital-to-digital" | "digital-to-analog" | "analog-to-digital" | "analog-to-analog"

export function processTransmission(mode: TransmissionMode, algorithm: string, inputData: string) {
  switch (mode) {
    case "digital-to-digital":
      return processDigitalToDigital(algorithm, inputData)
    case "digital-to-analog":
      return processDigitalToAnalog(algorithm, inputData)
    case "analog-to-digital":
      return processAnalogToDigital(algorithm, inputData)
    case "analog-to-analog":
      return processAnalogToAnalog(algorithm, inputData)
    default:
      return null
  }
}

function processDigitalToDigital(algorithm: string, data: string) {
  const bits = data.split("").map((b) => Number.parseInt(b))

  // Encode
  let encoded: number[]
  let level = 0 // Declare level variable once at function scope
  switch (algorithm) {
    case "nrz-l":
      encoded = bits.map((b) => b) // Direct mapping
      break
    case "nrz-i":
      encoded = []
      level = 0
      bits.forEach((b, idx) => {
        if (idx === 0) {
          level = b
        } else {
          if (b === 1) level = 1 - level
        }
        encoded.push(level)
      })
      break
    case "manchester":
      encoded = bits.flatMap((b) => (b === 1 ? [0, 1] : [1, 0]))
      break
    case "diff-manchester":
      encoded = []
      level = 0
      bits.forEach((b) => {
        if (b === 0) level = 1 - level // transition at start for 0
        const start = level
        level = 1 - level // mandatory mid-bit transition
        const mid = level
        encoded.push(start, mid)
      })
      break
    case "ami":
      let polarity = 1
      encoded = bits.map((b) => {
        if (b === 1) {
          const val = polarity
          polarity = -polarity
          return val
        }
        return 0
      })
      break
    default:
      encoded = bits
  }

  // Decode (reverse the encoding process)
  let decoded: string
  switch (algorithm) {
    case "nrz-l":
      decoded = encoded.map((b) => Math.round(b)).join("")
      break
    case "nrz-i":
      const decodedBits: number[] = [encoded[0]]
      for (let i = 1; i < encoded.length; i++) {
        decodedBits.push(encoded[i] !== encoded[i - 1] ? 1 : 0)
      }
      decoded = decodedBits.join("")
      break
    case "manchester":
      decoded = ""
      for (let i = 0; i < encoded.length; i += 2) {
        decoded += encoded[i] === 0 && encoded[i + 1] === 1 ? "1" : "0"
      }
      break
    case "diff-manchester":
      decoded = ""
      let prevLevel = 0
      for (let i = 0; i < encoded.length; i += 2) {
        const start = encoded[i]
        decoded += start !== prevLevel ? "0" : "1"
        const mid = encoded[i + 1]
        prevLevel = mid
      }
      break
    case "ami":
      decoded = encoded.map((e) => (e === 0 ? 0 : 1)).join("")
      break
    default:
      decoded = data
  }

  return {
    original: data,
    encoded: encoded,
    decoded: decoded,
    metrics: {
      bitRate: `${data.length * 1000} bps`,
      signalLevels: algorithm === "ami" ? "3" : "2",
      bandwidth: `${data.length * 500} Hz`,
    },
  }
}

function processDigitalToAnalog(algorithm: string, data: string) {
  const bits = data.split("").map((b) => Number.parseInt(b))

  let modulated: number[]
  const carrierFreq = 2 // Carrier frequency multiplier

  switch (algorithm) {
    case "ask":
      // Amplitude Shift Keying: 0 = low amplitude, 1 = high amplitude
      modulated = bits.flatMap((b) => Array(10).fill(b === 1 ? 1 : 0.3))
      break
    case "fsk":
      // Frequency Shift Keying: 0 = low freq, 1 = high freq
      modulated = bits.flatMap((b) => {
        const freq = b === 1 ? 4 : 2
        return Array(10)
          .fill(0)
          .map((_, i) => Math.sin((2 * Math.PI * freq * i) / 10))
      })
      break
    case "psk":
      // Phase Shift Keying: 0 = 0°, 1 = 180°
      modulated = bits.flatMap((b) =>
        Array(10)
          .fill(0)
          .map((_, i) => Math.sin((2 * Math.PI * carrierFreq * i) / 10 + (b === 1 ? Math.PI : 0))),
      )
      break
    case "qam":
      // Quadrature Amplitude Modulation (simplified)
      modulated = bits.flatMap((b) =>
        Array(10)
          .fill(0)
          .map((_, i) =>
            b === 1
              ? Math.sin((2 * Math.PI * carrierFreq * i) / 10) * 1.5
              : Math.sin((2 * Math.PI * carrierFreq * i) / 10) * 0.5,
          ),
      )
      break
    default:
      modulated = bits.flatMap((b) => Array(10).fill(b))
  }

  let demodulated = ""
  const SAMPLE_COUNT = 10
  for (let i = 0; i < modulated.length; i += SAMPLE_COUNT) {
    const segment = modulated.slice(i, i + SAMPLE_COUNT)
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
  }
}

const parseAnalogValues = (raw: string) => {
  // Remove ALL quotation-like characters, including unicode curly quotes
  const cleaned = raw.replace(/["“”„‟‹›«»'`]/g, "").trim()

  // Extract numbers robustly (supports floats, negatives, scientific notation)
  const matches = cleaned.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []

  return matches.map(Number)
}


function processAnalogToDigital(algorithm: string, data: string) {
  const analogValues = parseAnalogValues(data)

  // Sampling and Quantization
  let encoded: number[]
  switch (algorithm) {
    case "pcm":
      // 8-level quantization
      encoded = analogValues.map((v) => Math.round(v * 7) / 7)
      break
    case "delta":
    case "adaptive-delta":
      // Delta modulation: encode differences
      encoded = [analogValues[0]]
      for (let i = 1; i < analogValues.length; i++) {
        encoded.push(analogValues[i] - analogValues[i - 1] > 0 ? 1 : 0)
      }
      break
    default:
      encoded = analogValues
  }

  // Decode
  let decoded: number[]
  switch (algorithm) {
    case "delta":
    case "adaptive-delta":
      decoded = [encoded[0]]
      for (let i = 1; i < encoded.length; i++) {
        decoded.push(decoded[i - 1] + (encoded[i] === 1 ? 0.1 : -0.1))
      }
      break
    default:
      decoded = encoded
  }

  return {
    originalAnalog: analogValues,
    encoded: encoded,
    decodedAnalog: decoded,
    metrics: {
      bitRate: `${analogValues.length * 8000} bps`,
      signalLevels: "256",
      bandwidth: `${analogValues.length * 4000} Hz`,
    },
  }
}

function processAnalogToAnalog(algorithm: string, data: string) {
  const analogValues = parseAnalogValues(data)

  const SAMPLES = 20
  let modulated: number[]
  let demodulated: number[]

  switch (algorithm) {
    case "am":
      modulated = analogValues.flatMap((v) =>
        Array.from({ length: SAMPLES }, (_, i) => v * (1 + 0.5 * Math.sin((2 * Math.PI * i) / SAMPLES))),
      )
      demodulated = []
      for (let i = 0; i < modulated.length; i += SAMPLES) {
        const segment = modulated.slice(i, i + SAMPLES)
        const envelope = segment.reduce((sum, val) => sum + Math.abs(val), 0) / SAMPLES
        demodulated.push(envelope / 1.5)
      }
      break
    case "fm":
      modulated = analogValues.flatMap((v) => {
        const freq = 2 + Math.abs(v)
        return Array.from({ length: SAMPLES }, (_, i) => Math.sin((2 * Math.PI * freq * i) / SAMPLES))
      })
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
      break
    case "pm":
      modulated = analogValues.flatMap((v) =>
        Array.from({ length: SAMPLES }, (_, i) => Math.sin((2 * Math.PI * 2 * i) / SAMPLES + v)),
      )
      demodulated = []
      for (let i = 0; i < modulated.length; i += SAMPLES) {
        const segment = modulated.slice(i, i + SAMPLES)
        const phase = Math.atan2(segment[SAMPLES / 4] || 0, segment[0] || 1)
        demodulated.push(phase)
      }
      break
    default:
      modulated = analogValues
      demodulated = analogValues
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

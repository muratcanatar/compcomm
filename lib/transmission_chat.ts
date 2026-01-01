// ======================================================
// TRANSMISSION MODE
// ======================================================

export type TransmissionMode =
  | "digital-to-digital"
  | "digital-to-analog"
  | "analog-to-digital"
  | "analog-to-analog"

export function processTransmission(
  mode: TransmissionMode,
  algorithm: string,
  inputData: string
) {
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

// Utility
const parseBits = (data: string) => data.split("").map(n => Number(n));
const parseAnalog = (data: string) => {
  const cleaned = data.replace(/["“”]/g, "")
  const matches = cleaned.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []
  return matches.map((m) => Number.parseFloat(m)).filter((v) => !Number.isNaN(v))
}

// ======================================================
// DIGITAL → DIGITAL
// ======================================================

function processDigitalToDigital(algorithm: string, data: string) {
  const bits = parseBits(data)
  let encoded: number[] = []
  let decoded = ""

  switch (algorithm) {
    case "nrz-l":
      encoded = [...bits]
      decoded = bits.join("")
      break

    case "nrz-i": {
      encoded = []
      let level = 0
      bits.forEach((b) => {
        if (b === 1) level = 1 - level
        encoded.push(level)
      })

      // decode NRZ-I
      const rec: number[] = [bits[0]]
      for (let i = 1; i < encoded.length; i++) {
        rec.push(encoded[i] !== encoded[i - 1] ? 1 : 0)
      }
      decoded = rec.join("")
      break
    }

    case "manchester":
      encoded = bits.flatMap((b) => (b === 1 ? [0, 1] : [1, 0]))
      decoded = encoded.reduce((acc, _, i) => {
        if (i % 2 === 0) acc += encoded[i] === 0 ? "1" : "0"
        return acc
      }, "")
      break

    case "diff-manchester": {
      encoded = []
      let level = 0
      bits.forEach((b) => {
        if (b === 0) level = 1 - level // transition at start for 0
        const start = level
        level = 1 - level // mandatory mid-bit transition
        const mid = level
        encoded.push(start, mid)
      })

      decoded = ""
      let prevLevel = 0 // assumed initial level before first bit
      for (let i = 0; i < encoded.length; i += 2) {
        const start = encoded[i]
        decoded += start === prevLevel ? "1" : "0"
        const mid = encoded[i + 1]
        prevLevel = mid
      }
      break
    }

    case "ami": {
      let polarity = 1
      encoded = bits.map((b) => {
        if (b === 1) {
          const out = polarity
          polarity = -polarity
          return out
        }
        return 0
      })

      decoded = encoded.map((v) => (v === 0 ? "0" : "1")).join("")
      break
    }

    default:
      encoded = [...bits]
      decoded = data
  }

  return {
    original: data,
    encoded,
    decoded,
    metrics: calcMetrics(data.length, algorithm),
  }
}

// ======================================================
// DIGITAL → ANALOG
// ======================================================

function processDigitalToAnalog(algorithm: string, data: string) {
  const bits = parseBits(data)
  let modulated: number[] = []
  const CARRIER = 2
  const SAMPLE_COUNT = 10

  switch (algorithm) {
    case "ask":
      modulated = bits.flatMap((b) =>
        Array(SAMPLE_COUNT).fill(b === 1 ? 1 : 0.2)
      )
      break

    case "fsk":
      modulated = bits.flatMap((b) => {
        const freq = b === 1 ? 4 : 2
        return Array(SAMPLE_COUNT)
          .fill(0)
          .map((_, i) => Math.sin((2 * Math.PI * freq * i) / SAMPLE_COUNT))
      })
      break

    case "psk":
      modulated = bits.flatMap((b) =>
        Array(SAMPLE_COUNT)
          .fill(0)
          .map((_, i) =>
            Math.sin(
              (2 * Math.PI * CARRIER * i) / SAMPLE_COUNT + (b === 1 ? Math.PI : 0)
            )
          )
      )
      break

    case "qam":
      modulated = bits.flatMap((b) =>
        Array(SAMPLE_COUNT)
          .fill(0)
          .map((_, i) =>
            Math.sin((2 * Math.PI * CARRIER * i) / SAMPLE_COUNT) *
            (b === 1 ? 1.5 : 0.5)
          )
      )
      break

    default:
      modulated = bits.flatMap((b) => Array(SAMPLE_COUNT).fill(b))
  }

  return {
    original: data,
    encoded: modulated,
    decoded: bits.join(""), // dummy demodulation
    metrics: calcMetrics(data.length, algorithm),
  }
}

// ======================================================
// ANALOG → DIGITAL
// ======================================================

function processAnalogToDigital(algorithm: string, data: string) {
  const analogValues = parseAnalog(data)
  let encoded: number[] = []
  let decoded: number[] = []

  switch (algorithm) {
    case "pcm":
      encoded = analogValues.map((v) => Math.round(v * 7) / 7)
      decoded = [...encoded]
      break

    case "delta":
    case "adaptive-delta":
      encoded = [analogValues[0]]
      for (let i = 1; i < analogValues.length; i++) {
        encoded.push(analogValues[i] > analogValues[i - 1] ? 1 : 0)
      }
      decoded = [encoded[0]]
      for (let i = 1; i < encoded.length; i++) {
        decoded.push(decoded[i - 1] + (encoded[i] === 1 ? 0.1 : -0.1))
      }
      break

    default:
      encoded = [...analogValues]
      decoded = [...analogValues]
  }

  return {
    originalAnalog: analogValues,
    encoded,
    decodedAnalog: decoded,
    metrics: calcAnalogMetrics(analogValues.length),
  }
}

// ======================================================
// ANALOG → ANALOG
// ======================================================

function processAnalogToAnalog(algorithm: string, data: string) {
  const analogValues = parseAnalog(data)

  const SAMPLES = 20
  let modulated: number[]
  let demodulated: number[]

  switch (algorithm) {
    case "am":
      modulated = analogValues.flatMap((v) =>
        Array.from({ length: SAMPLES }, (_, i) => v * (1 + 0.5 * Math.sin((2 * Math.PI * i) / SAMPLES))),
      )
      demodulated = [...modulated]
      break
    case "fm":
      modulated = analogValues.flatMap((v) => {
        const freq = 2 + Math.abs(v)
        return Array.from({ length: SAMPLES }, (_, i) => Math.sin((2 * Math.PI * freq * i) / SAMPLES))
      })
      demodulated = [...modulated]
      break
    case "pm":
      modulated = analogValues.flatMap((v) =>
        Array.from({ length: SAMPLES }, (_, i) => Math.sin((2 * Math.PI * 2 * i) / SAMPLES + v)),
      )
      demodulated = [...modulated]
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
      bitRate: "N/A",
      signalLevels: "Continuous",
      bandwidth: `${analogValues.length * 1000} Hz`,
    },
  }
}

// ======================================================
// METRIC HELPERS
// ======================================================

function calcMetrics(length: number, algorithm: string) {
  return {
    bitRate: `${length * 1000} bps`,
    signalLevels:
      algorithm === "qam"
        ? "16"
        : algorithm === "psk"
        ? "4"
        : algorithm === "ami"
        ? "3"
        : "2",
    bandwidth: `${length * 500} Hz`,
  }
}

function calcAnalogMetrics(length: number) {
  return {
    bitRate: `${length * 8000} bps`,
    signalLevels: "256",
    bandwidth: `${length * 4000} Hz`,
  }
}

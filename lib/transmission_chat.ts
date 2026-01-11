// ============================================================
// COMPACT TRANSMISSION LIBRARY - CHAT VERSION
// Minimal, fast implementation with inline optimizations
// ============================================================

export type TransmissionMode = "digital-to-digital" | "digital-to-analog" | "analog-to-digital" | "analog-to-analog"

// Constants
const S = 10  // Samples per bit
const C = 2   // Carrier frequency
const A = 20  // Analog samples
const L = 256 // PCM levels

// Helpers
const bits = (s: string) => s.split("").map(Number)
const analog = (s: string) => (s.replace(/["""]/g, "").match(/-?\d*\.?\d+/g) || []).map(Number)
const wave = (n: number, f: (i: number) => number) => Array.from({ length: n }, (_, i) => f(i))
const zeros = (a: number[]) => a.slice(1).filter((v, i) => (a[i] >= 0) !== (v >= 0)).length

export function processTransmission(mode: TransmissionMode, algo: string, data: string) {
  switch (mode) {
    case "digital-to-digital": return d2d(algo, data)
    case "digital-to-analog": return d2a(algo, data)
    case "analog-to-digital": return a2d(algo, data)
    case "analog-to-analog": return a2a(algo, data)
    default: return null
  }
}

// ============================================================
// DIGITAL TO DIGITAL
// ============================================================
function d2d(algo: string, data: string) {
  const b = bits(data)
  let enc: number[], dec: string

  switch (algo) {
    case "nrz-l":
      enc = [...b]
      dec = enc.join("")
      break

    case "nrz-i": {
      enc = []
      let lv = 0
      b.forEach(x => { if (x === 1) lv = 1 - lv; enc.push(lv) })
      dec = enc.map((v, i) => i === 0 ? v : (v !== enc[i-1] ? 1 : 0)).join("")
      break
    }

    case "manchester":
      enc = b.flatMap(x => x ? [0, 1] : [1, 0])
      dec = wave(b.length, i => enc[i*2] === 0 ? 1 : 0).join("")
      break

    case "diff-manchester": {
      enc = []
      let lv = 0
      b.forEach(x => {
        if (x === 0) lv = 1 - lv
        enc.push(lv, 1 - lv)
        lv = 1 - lv
      })
      dec = ""
      let prev = 0
      for (let i = 0; i < enc.length; i += 2) {
        dec += enc[i] !== prev ? "0" : "1"
        prev = enc[i + 1]
      }
      break
    }

    case "ami": {
      let pol = 1
      enc = b.map(x => x ? (pol = -pol, -pol) : 0)
      dec = enc.map(x => x ? 1 : 0).join("")
      break
    }

    default:
      enc = [...b]
      dec = data
  }

  return {
    original: data,
    encoded: enc,
    decoded: dec,
    metrics: {
      bitRate: `${data.length * 1000} bps`,
      signalLevels: algo === "ami" ? "3" : "2",
      bandwidth: `${data.length * 500} Hz`,
    },
  }
}

// ============================================================
// DIGITAL TO ANALOG
// ============================================================
function d2a(algo: string, data: string) {
  const b = bits(data)
  let mod: number[]

  switch (algo) {
    case "ask":
      mod = b.flatMap(x => wave(S, () => x ? 1 : 0.3))
      break
    case "fsk":
      mod = b.flatMap(x => wave(S, i => Math.sin(2 * Math.PI * (x ? 4 : 2) * i / S)))
      break
    case "psk":
      mod = b.flatMap(x => wave(S, i => Math.sin(2 * Math.PI * C * i / S + (x ? Math.PI : 0))))
      break
    case "qam":
      mod = b.flatMap(x => wave(S, i => Math.sin(2 * Math.PI * C * i / S) * (x ? 1.5 : 0.5)))
      break
    default:
      mod = b.flatMap(x => wave(S, () => x))
  }

  let dem = ""
  for (let i = 0; i < mod.length; i += S) {
    const seg = mod.slice(i, i + S)
    const avg = seg.reduce((a, v) => a + Math.abs(v), 0) / S

    if (algo === "ask") dem += avg > 0.6 ? "1" : "0"
    else if (algo === "fsk") dem += zeros(seg) >= 6 ? "1" : "0"
    else if (algo === "psk") {
      let cor = 0
      for (let j = 0; j < S; j++) cor += seg[j] * Math.sin(2 * Math.PI * C * j / S)
      dem += cor < 0 ? "1" : "0"
    }
    else if (algo === "qam") dem += avg > 0.8 ? "1" : "0"
    else dem += avg > 0.5 ? "1" : "0"
  }

  return {
    original: data,
    encoded: mod,
    decoded: dem,
    metrics: {
      bitRate: `${data.length * 1000} bps`,
      signalLevels: algo === "qam" ? "16" : algo === "psk" ? "4" : "2",
      bandwidth: `${data.length * 2000} Hz`,
    },
  }
}

// ============================================================
// ANALOG TO DIGITAL
// ============================================================
function a2d(algo: string, data: string) {
  const v = analog(data)
  if (!v.length) return {
    originalAnalog: [], encoded: [], decodedAnalog: [],
    metrics: { bitRate: "0 bps", signalLevels: "256", bandwidth: "0 Hz" }
  }

  const min = Math.min(...v), max = Math.max(...v), rng = max - min || 1
  const norm = v.map(x => (x - min) / rng)

  let enc: number[], dec: number[]

  switch (algo) {
    case "pcm":
      enc = norm.map(x => Math.round(x * (L - 1)))
      dec = enc.map(x => x / (L - 1) * rng + min)
      break

    case "delta":
    case "adaptive-delta":
      enc = []
      dec = [v[0]]
      for (let i = 1; i < v.length; i++) {
        const d = v[i] - v[i - 1]
        enc.push(d >= 0 ? 1 : 0)
        dec.push(dec[dec.length - 1] + (d >= 0 ? Math.abs(d) : -Math.abs(d)))
      }
      break

    default:
      enc = [...v]
      dec = [...v]
  }

  return {
    originalAnalog: v,
    encoded: enc,
    decodedAnalog: dec,
    metrics: {
      bitRate: `${v.length * 8000} bps`,
      signalLevels: algo === "pcm" ? "256" : "2",
      bandwidth: `${v.length * 4000} Hz`,
    },
  }
}

// ============================================================
// ANALOG TO ANALOG
// ============================================================
function a2a(algo: string, data: string) {
  const v = analog(data)
  if (!v.length) return {
    originalAnalog: [], encoded: [], decodedAnalog: [], demodulatedSignal: [],
    metrics: { bitRate: "N/A", signalLevels: "Continuous", bandwidth: "0 Hz" }
  }

  let mod: number[], dem: number[]

  switch (algo) {
    case "am":
      mod = v.flatMap(x => wave(A, i => x * (1 + 0.5 * Math.sin(2 * Math.PI * i / A))))
      dem = []
      for (let i = 0; i < mod.length; i += A) {
        dem.push(mod.slice(i, i + A).reduce((a, x) => a + Math.abs(x), 0) / A / 1.5)
      }
      break

    case "fm":
      mod = v.flatMap(x => wave(A, i => Math.sin(2 * Math.PI * (2 + Math.abs(x)) * i / A)))
      dem = []
      for (let i = 0; i < mod.length; i += A) {
        dem.push(zeros(mod.slice(i, i + A)) / 2 - 2)
      }
      break

    case "pm":
      mod = v.flatMap(x => wave(A, i => Math.sin(2 * Math.PI * 2 * i / A + x)))
      dem = []
      for (let i = 0; i < mod.length; i += A) {
        const seg = mod.slice(i, i + A)
        dem.push(Math.atan2(seg[A / 4] || 0, seg[0] || 1))
      }
      break

    default:
      mod = [...v]
      dem = [...v]
  }

  return {
    originalAnalog: v,
    encoded: mod,
    decodedAnalog: v,
    demodulatedSignal: dem,
    metrics: {
      bitRate: "N/A (Analog)",
      signalLevels: "Continuous",
      bandwidth: `${v.length * 1000} Hz`,
    },
  }
}

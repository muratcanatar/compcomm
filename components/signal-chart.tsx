"use client"

type TransmissionMode = "digital-to-digital" | "digital-to-analog" | "analog-to-digital" | "analog-to-analog"

interface SignalChartProps {
  data: string | number[]
  mode: TransmissionMode
  type: "input" | "encoded" | "output"
  algorithm: string
}

export function SignalChart({ data, mode, type, algorithm }: SignalChartProps) {
  if (!data) {
    return (
      <div className="h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No signal data</p>
      </div>
    )
  }

  // Convert data to array format
  let signalData: number[]
  if (typeof data === "string") {
    signalData = data.split("").map((bit) => Number.parseInt(bit))
  } else {
    signalData = data
  }

  const renderDigitalSignal = (values: number[]) => {
    if (!values.length || values.some((v) => Number.isNaN(v))) {
      return (
        <div className="h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No signal data</p>
        </div>
      )
    }

    const width = 600
    const height = 150 // Increased height to accommodate bit interval labels
    const padding = 20
    const bottomPadding = 40 // Extra padding for bit interval labels
    const signalWidth = width - 2 * padding
    const signalHeight = height - padding - bottomPadding
    const bitWidth = signalWidth / values.length

    let path = ""
    let lastY = padding + signalHeight / 2

    const drawLevel = (x: number, y: number, width: number) => {
      if (path === "") {
        path = `M ${x} ${y}`
      } else if (y !== lastY) {
        path += ` L ${x} ${lastY} L ${x} ${y}`
      }
      path += ` L ${x + width} ${y}`
      lastY = y
    }

    if (type === "encoded" && (algorithm === "manchester" || algorithm === "diff-manchester")) {
      const halfBitWidth = signalWidth / values.length
      values.forEach((val, i) => {
        const x = padding + i * halfBitWidth
        const y = val === 1 ? padding : padding + signalHeight
        drawLevel(x, y, halfBitWidth)
      })
    } else if (algorithm === "ami") {
      // AMI: 3 levels (-1, 0, 1)
      values.forEach((val, i) => {
        const x = padding + i * bitWidth
        let y
        if (val === 1) y = padding
        else if (val === -1) y = padding + signalHeight
        else y = padding + signalHeight / 2
        drawLevel(x, y, bitWidth)
      })
    } else if (algorithm === "pcm" && type === "encoded") {
      // PCM: 256 levels (0-255) - map to signal height
      const maxLevel = Math.max(...values) || 255
      values.forEach((val, i) => {
        const x = padding + i * bitWidth
        const y = padding + signalHeight - (val / maxLevel) * signalHeight
        drawLevel(x, y, bitWidth)
      })
    } else {
      // Default binary: 0 = low, 1 = high
      values.forEach((val, i) => {
        const x = padding + i * bitWidth
        const y = val === 1 ? padding : padding + signalHeight
        drawLevel(x, y, bitWidth)
      })
    }

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
        <rect width={width} height={height} fill="transparent" />
        <line
          x1={padding}
          y1={padding + signalHeight / 2}
          x2={width - padding}
          y2={padding + signalHeight / 2}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 4"
          className="text-border"
        />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={type === "input" ? "text-primary" : type === "encoded" ? "text-chart-1" : "text-chart-2"}
        />
        <text x={padding} y={padding - 5} className="text-[10px] fill-muted-foreground">
          High
        </text>
        <text x={padding} y={padding + signalHeight + 12} className="text-[10px] fill-muted-foreground">
          Low
        </text>

        {values.map((bit, i) => {
          const x = padding + i * bitWidth
          const centerX = x + bitWidth / 2
          return (
            <g key={i}>
              {/* Vertical line at bit boundary */}
              <line
                x1={x}
                y1={padding + signalHeight + 5}
                x2={x}
                y2={padding + signalHeight + 15}
                stroke="currentColor"
                strokeWidth="1"
                className="text-muted-foreground"
              />
              {/* Bit value label */}
              <text
                x={centerX}
                y={padding + signalHeight + 30}
                textAnchor="middle"
                className="text-[11px] font-medium fill-foreground"
              >
                {bit}
              </text>
            </g>
          )
        })}
        {/* Final boundary line */}
        <line
          x1={padding + values.length * bitWidth}
          y1={padding + signalHeight + 5}
          x2={padding + values.length * bitWidth}
          y2={padding + signalHeight + 15}
          stroke="currentColor"
          strokeWidth="1"
          className="text-muted-foreground"
        />
      </svg>
    )
  }

  const renderAnalogSignal = (values: number[]) => {
    if (!values.length || values.some((v) => Number.isNaN(v))) {
      return (
        <div className="h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No signal data</p>
        </div>
      )
    }

    const width = 600
    const height = 150
    const padding = 20
    const bottomPadding = 40
    const signalWidth = width - 2 * padding
    const signalHeight = height - padding - bottomPadding

    // For encoded signals (modulated waveforms), draw the actual values
    // For input signals in analog modes, also draw actual values
    const isModulatedSignal = type === "encoded" &&
      (algorithm === "ask" || algorithm === "fsk" || algorithm === "psk" || algorithm === "qam" ||
       algorithm === "am" || algorithm === "fm" || algorithm === "pm")

    let path = ""

    if (isModulatedSignal) {
      // Draw the actual modulated waveform from transmission.ts
      const minVal = Math.min(...values)
      const maxVal = Math.max(...values)
      const range = maxVal - minVal || 1

      values.forEach((val, i) => {
        const x = padding + (i / values.length) * signalWidth
        // Normalize to fit in signalHeight, centered
        const normalized = (val - minVal) / range
        const y = padding + signalHeight - normalized * signalHeight
        if (i === 0) {
          path = `M ${x} ${y}`
        } else {
          path += ` L ${x} ${y}`
        }
      })
    } else if (algorithm === "pcm") {
      // PCM: Quantized steps - show actual quantized values
      const minVal = Math.min(...values)
      const maxVal = Math.max(...values)
      const range = maxVal - minVal || 1

      values.forEach((val, i) => {
        const x = padding + (i / values.length) * signalWidth
        const normalized = (val - minVal) / range
        const y = padding + signalHeight - normalized * signalHeight
        if (i === 0) {
          path = `M ${x} ${y}`
        } else {
          path += ` L ${x} ${y}`
        }
      })
    } else {
      // Default: draw actual values as continuous line
      const minVal = Math.min(...values)
      const maxVal = Math.max(...values)
      const range = maxVal - minVal || 1

      values.forEach((val, i) => {
        const x = padding + (i / values.length) * signalWidth
        const normalized = (val - minVal) / range
        const y = padding + signalHeight - normalized * signalHeight
        if (i === 0) {
          path = `M ${x} ${y}`
        } else {
          path += ` L ${x} ${y}`
        }
      })
    }

    // Calculate point positions for analog signals (to show sample points)
    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)
    const range = maxVal - minVal || 1
    const samplePoints = values.map((val, i) => ({
      x: padding + (i / (values.length - 1 || 1)) * signalWidth,
      y: padding + signalHeight - ((val - minVal) / range) * signalHeight
    }))

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
        <rect width={width} height={height} fill="transparent" />
        <line
          x1={padding}
          y1={padding + signalHeight / 2}
          x2={width - padding}
          y2={padding + signalHeight / 2}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 4"
          className="text-border"
        />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={type === "input" ? "text-primary" : type === "encoded" ? "text-chart-1" : "text-chart-2"}
        />
        {/* Show sample points for analog input/output */}
        {mode === "analog-to-digital" && (type === "input" || type === "output") && samplePoints.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r={4}
            className={type === "input" ? "fill-primary" : "fill-chart-2"}
          />
        ))}
      </svg>
    )
  }

  // Digital-to-Digital: all signals are digital
  // Digital-to-Analog: input is digital, encoded is analog waveform, output (decoded) is digital
  // Analog-to-Digital: input is analog, encoded is digital (PCM levels or delta bits), output is analog
  // Analog-to-Analog: all signals are analog
  const isDigitalMode =
    mode === "digital-to-digital" ||
    (mode === "digital-to-analog" && (type === "input" || type === "output")) ||
    (mode === "analog-to-digital" && type === "encoded")

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {isDigitalMode ? renderDigitalSignal(signalData) : renderAnalogSignal(signalData)}
    </div>
  )
}

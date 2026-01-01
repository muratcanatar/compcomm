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

    let path = `M ${padding} ${padding + signalHeight / 2}`

    // NRZ-L: High for 1, Low for 0
    if (algorithm === "nrz-l" || type === "input") {
      values.forEach((bit, i) => {
        const x = padding + i * bitWidth
        const y = bit === 1 ? padding : padding + signalHeight
        path += ` L ${x} ${y} L ${x + bitWidth} ${y}`
      })
    }
    // NRZ-I: Transition on 1
    else if (algorithm === "nrz-i") {
      let currentLevel = 0
      values.forEach((bit, i) => {
        const x = padding + i * bitWidth
        if (bit === 1) currentLevel = 1 - currentLevel
        const y = currentLevel === 1 ? padding : padding + signalHeight
        path += ` L ${x} ${y} L ${x + bitWidth} ${y}`
      })
    }
    // Manchester: Transition in middle
    else if (algorithm === "manchester") {
      values.forEach((bit, i) => {
        const x = padding + i * bitWidth
        const midX = x + bitWidth / 2
        if (bit === 1) {
          path += ` L ${x} ${padding + signalHeight} L ${midX} ${padding + signalHeight} L ${midX} ${padding} L ${x + bitWidth} ${padding}`
        } else {
          path += ` L ${x} ${padding} L ${midX} ${padding} L ${midX} ${padding + signalHeight} L ${x + bitWidth} ${padding + signalHeight}`
        }
      })
    }
    // Differential Manchester
    else if (algorithm === "diff-manchester") {
      let currentLevel = 0
      values.forEach((bit, i) => {
        const x = padding + i * bitWidth
        const midX = x + bitWidth / 2
        if (bit === 0) currentLevel = 1 - currentLevel

        const startY = currentLevel === 1 ? padding : padding + signalHeight
        const endY = currentLevel === 1 ? padding + signalHeight : padding

        path += ` L ${x} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${x + bitWidth} ${endY}`
        currentLevel = 1 - currentLevel
      })
    }
    // AMI: Alternating polarity for 1s
    else if (algorithm === "ami") {
      let polarity = 1
      values.forEach((bit, i) => {
        const x = padding + i * bitWidth
        if (bit === 1) {
          const y = polarity === 1 ? padding : padding + signalHeight
          path += ` L ${x} ${y} L ${x + bitWidth} ${y}`
          polarity *= -1
        } else {
          const y = padding + signalHeight / 2
          path += ` L ${x} ${y} L ${x + bitWidth} ${y}`
        }
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
    const height = 150 // Increased height to accommodate bit interval labels
    const padding = 20
    const bottomPadding = 40 // Extra padding for bit interval labels
    const signalWidth = width - 2 * padding
    const signalHeight = height - padding - bottomPadding
    const bitWidth = signalWidth / values.length

    let path = `M ${padding} ${padding + signalHeight / 2}`

    if (algorithm === "ask") {
      // ASK: Different amplitudes
      values.forEach((bit, i) => {
        const x = padding + (i / values.length) * signalWidth
        const amplitude = bit === 1 ? signalHeight / 2 : signalHeight / 4
        const points = 20
        for (let j = 0; j < points; j++) {
          const px = x + (j / points) * (signalWidth / values.length)
          const py = padding + signalHeight / 2 - amplitude * Math.sin((j / points) * Math.PI * 4)
          path += ` L ${px} ${py}`
        }
      })
    } else if (algorithm === "fsk") {
      // FSK: Different frequencies
      values.forEach((bit, i) => {
        const x = padding + (i / values.length) * signalWidth
        const freq = bit === 1 ? 6 : 3
        const points = 20
        for (let j = 0; j < points; j++) {
          const px = x + (j / points) * (signalWidth / values.length)
          const py = padding + signalHeight / 2 - (signalHeight / 3) * Math.sin((j / points) * Math.PI * freq)
          path += ` L ${px} ${py}`
        }
      })
    } else if (algorithm === "psk" || algorithm === "qam") {
      // PSK: Phase shifts
      let phase = 0
      values.forEach((bit, i) => {
        if (bit === 1) phase = Math.PI
        else phase = 0
        const x = padding + (i / values.length) * signalWidth
        const points = 20
        for (let j = 0; j < points; j++) {
          const px = x + (j / points) * (signalWidth / values.length)
          const py = padding + signalHeight / 2 - (signalHeight / 3) * Math.sin((j / points) * Math.PI * 4 + phase)
          path += ` L ${px} ${py}`
        }
      })
    } else if (algorithm === "pcm") {
      // PCM: Quantized steps
      values.forEach((val, i) => {
        const x = padding + (i / values.length) * signalWidth
        const y = padding + signalHeight - val * signalHeight
        path += ` L ${x} ${y}`
      })
    } else if (algorithm === "am" || algorithm === "fm" || algorithm === "pm") {
      // Analog modulation
      const numPoints = values.length * 20
      for (let i = 0; i < numPoints; i++) {
        const x = padding + (i / numPoints) * signalWidth
        const t = i / numPoints
        let y

        if (algorithm === "am") {
          const message = 0.5 + 0.5 * Math.sin(t * Math.PI * 4)
          y = padding + signalHeight / 2 - message * (signalHeight / 3) * Math.sin(t * Math.PI * 20)
        } else if (algorithm === "fm") {
          const message = Math.sin(t * Math.PI * 4)
          y = padding + signalHeight / 2 - (signalHeight / 3) * Math.sin(t * Math.PI * 20 + message * 5)
        } else {
          const message = Math.sin(t * Math.PI * 4)
          y = padding + signalHeight / 2 - (signalHeight / 3) * Math.sin(t * Math.PI * 20 + message)
        }

        path += ` L ${x} ${y}`
      }
    } else {
      // Default sine wave
      const numPoints = 100
      for (let i = 0; i < numPoints; i++) {
        const x = padding + (i / numPoints) * signalWidth
        const y = padding + signalHeight / 2 - (signalHeight / 3) * Math.sin((i / numPoints) * Math.PI * 8)
        path += ` L ${x} ${y}`
      }
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
          strokeWidth="2"
          className={type === "input" ? "text-primary" : type === "encoded" ? "text-chart-1" : "text-chart-2"}
        />

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

  const isDigitalMode = mode === "digital-to-digital" || (mode === "digital-to-analog" && type !== "encoded")

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {isDigitalMode ? renderDigitalSignal(signalData) : renderAnalogSignal(signalData)}
    </div>
  )
}

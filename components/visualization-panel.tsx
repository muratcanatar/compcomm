"use client"

import { Card } from "@/components/ui/card"
import { Monitor, ArrowRight } from "lucide-react"
import { SignalChart } from "@/components/signal-chart"

type TransmissionMode =
  | "digital-to-digital"
  | "digital-to-analog"
  | "analog-to-digital"
  | "analog-to-analog"

interface TransmissionResult {
  original?: string
  originalAnalog?: number[]
  encoded?: number[]
  decoded?: string
  decodedAnalog?: number[]
  demodulatedSignal?: number[]
  metrics?: {
    bitRate: string
    signalLevels: string
    bandwidth: string
  }
}

interface VisualizationPanelProps {
  mode: TransmissionMode
  algorithm: string
  inputData: string
  results: TransmissionResult | undefined
  isProcessing: boolean
}

// --- NEW: Universal parser for analog/digital signals ---
function parseInput(mode: TransmissionMode, raw: string): number[] {
  if (!raw) return []

  // Analog modes → parse analog values
  if (mode.includes("analog")) {
    const cleaned = raw.replace(/["“”„‟‹›«»'`]/g, "").trim()
    const matches = cleaned.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []
    return matches.map(Number)
  }

  // Digital modes → split bits
  return raw.split("").map((b) => Number.parseInt(b))
}

export function VisualizationPanel({
  mode,
  algorithm,
  inputData,
  results,
  isProcessing,
}: VisualizationPanelProps) {
  
  // --- FIXED: Always pass numeric arrays to charts ---
  const parsedInput = parseInput(mode, inputData)

  const encodedSignal =
    Array.isArray(results?.encoded) ? results.encoded : []

  const outputSignal =
    results?.demodulatedSignal ??
    results?.decoded ??
    results?.decodedAnalog ??
    []

  return (
    <Card className="p-6 h-full">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Data Transmission Visualization
          </h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Monitor className="h-4 w-4" />
            <span>Computer A</span>
            <ArrowRight className="h-3 w-3" />
            <Monitor className="h-4 w-4" />
            <span>Computer B</span>
          </div>
        </div>

        {/* ---------------- INPUT ---------------- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Input Signal (Computer A)
            </h3>
            <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary">
              Source
            </span>
          </div>

          {/* FIXED: Always send numeric array */}
          <SignalChart
            data={parsedInput}
            mode={mode}
            type="input"
            algorithm={algorithm}
          />
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-75" />
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-150" />
              <span className="ml-2 text-sm text-muted-foreground">
                Processing transmission...
              </span>
            </div>
          </div>
        )}

        {/* ---------------- ENCODED / MODULATED ---------------- */}
        {results && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {mode.includes("digital-to-digital") ||
                mode.includes("analog-to-digital")
                  ? "Encoded"
                  : "Modulated"}{" "}
                Signal
              </h3>
              <span className="text-xs px-2 py-1 rounded-md bg-chart-1/10 text-chart-1">
                Transmission
              </span>
            </div>

            {/* FIXED: encodedSignal is guaranteed number[] */}
            <SignalChart
              data={encodedSignal}
              mode={mode}
              type="encoded"
              algorithm={algorithm}
            />
          </div>
        )}

        {/* ---------------- OUTPUT ---------------- */}
        {results && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {mode.includes("digital-to-digital") ||
                mode.includes("analog-to-digital")
                  ? "Decoded"
                  : "Demodulated"}{" "}
                Signal (Computer B)
              </h3>
              <span className="text-xs px-2 py-1 rounded-md bg-chart-2/10 text-chart-2">
                Destination
              </span>
            </div>

            {/* FIXED: outputSignal is guaranteed number[] */}
            <SignalChart
              data={outputSignal}
              mode={mode}
              type="output"
              algorithm={algorithm}
            />
          </div>
        )}
      </div>
    </Card>
  )
}

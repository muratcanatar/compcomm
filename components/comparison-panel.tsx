"use client"

import { Card } from "@/components/ui/card"
import type { TransmissionImplementation } from "@/components/implementation-selector"

type TransmissionMode = "digital-to-digital" | "digital-to-analog" | "analog-to-digital" | "analog-to-analog"

interface TransmissionData {
  original?: string
  originalAnalog?: number[]
  encoded?: number[]
  decoded?: string
  decodedAnalog?: number[]
  metrics?: {
    bitRate: string
    signalLevels: string
    bandwidth: string
  }
}

interface ComparisonPanelProps {
  results: Record<TransmissionImplementation, { data: TransmissionData; durationMs: number }>
  mode: TransmissionMode
}

const implementationLabels: Record<TransmissionImplementation, string> = {
  original: "Student Code",
  chat: "ChatGPT AI",
  gemini: "Gemini AI",
}

const order: TransmissionImplementation[] = ["original", "chat", "gemini"]

const isSuccessful = (payload: TransmissionData) => {
  const originalValue = payload?.original ?? payload?.originalAnalog
  const decodedValue = payload?.decoded ?? payload?.decodedAnalog

  if (originalValue === undefined || decodedValue === undefined) return false

  if (Array.isArray(originalValue) && Array.isArray(decodedValue)) {
    if (originalValue.length !== decodedValue.length) return false
    return originalValue.every(
      (val, idx) => Math.abs(Number(val) - Number(decodedValue[idx])) <= 1e-3,
    )
  }

  return String(originalValue) === String(decodedValue)
}

export function ComparisonPanel({ results, mode }: ComparisonPanelProps) {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Implementation Comparison</h3>
        <span className="text-xs text-muted-foreground">Runtime & accuracy across codes</span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {order.map((key) => {
          const entry = results[key]
          if (!entry) return null

          const success = isSuccessful(entry.data)
          const label = implementationLabels[key]

          return (
            <div key={key} className="rounded-lg border border-border p-4 space-y-2 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{label}</span>
                <span
                  className={`text-xs px-2 py-1 rounded-md ${
                    success ? "bg-chart-2/15 text-chart-2" : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {success ? "Match" : "Mismatch"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Runtime</span>
                <span className="font-medium text-foreground">{entry.durationMs.toFixed(2)} ms</span>
              </div>

              <div className="text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Bit Rate</span>
                  <span className="font-medium text-foreground">{entry.data?.metrics?.bitRate ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Signal Levels</span>
                  <span className="font-medium text-foreground">{entry.data?.metrics?.signalLevels ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Bandwidth</span>
                  <span className="font-medium text-foreground">{entry.data?.metrics?.bandwidth ?? "—"}</span>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground">
                {mode.includes("analog") ? "Analog metrics sampled" : "Digital signal check"}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

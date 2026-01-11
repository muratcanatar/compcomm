import { Card } from "@/components/ui/card"
import { CheckCircle2, AlertCircle } from "lucide-react"

type TransmissionMode = "digital-to-digital" | "digital-to-analog" | "analog-to-digital" | "analog-to-analog"

interface TransmissionResult {
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

interface ResultsPanelProps {
  mode: TransmissionMode
  algorithm: string
  results: TransmissionResult
  implementationLabel: string
  durationMs?: number
}

export function ResultsPanel({ mode, algorithm, results, implementationLabel, durationMs }: ResultsPanelProps) {
  const areArraysClose = (a: number[], b: number[], tolerance = 0.01) => {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((val, idx) => Math.abs(Number(val) - Number(b[idx])) <= tolerance)
  }

  const isSuccessful = (() => {
    const originalValue = results.original ?? results.originalAnalog
    const decodedValue = results.decoded ?? results.decodedAnalog

    if (originalValue === undefined || decodedValue === undefined) return false

    if (Array.isArray(originalValue) && Array.isArray(decodedValue)) {
      return areArraysClose(originalValue, decodedValue)
    }

    return String(originalValue) === String(decodedValue)
  })()

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {isSuccessful ? (
            <CheckCircle2 className="h-5 w-5 text-chart-2" />
          ) : (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
          <h3 className="text-lg font-semibold text-foreground">Transmission Results</h3>
        </div>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2 py-2 border-b border-border">
            <span className="text-muted-foreground">Mode:</span>
            <span className="font-medium text-foreground">
              {mode
                .split("-")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join("-to-")}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 py-2 border-b border-border">
            <span className="text-muted-foreground">Algorithm:</span>
            <span className="font-medium text-foreground">{algorithm.toUpperCase()}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 py-2 border-b border-border">
            <span className="text-muted-foreground">Implementation:</span>
            <span className="font-medium text-foreground">{implementationLabel}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 py-2 border-b border-border">
            <span className="text-muted-foreground">Runtime:</span>
            <span className="font-medium text-foreground">
              {durationMs !== undefined ? `${durationMs.toFixed(2)} ms` : "—"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 py-2 border-b border-border">
            <span className="text-muted-foreground">Original Data:</span>
            <span className="font-mono text-xs text-foreground break-all">
              {results.original || results.originalAnalog?.join(", ")}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 py-2 border-b border-border">
            <span className="text-muted-foreground">Received Data:</span>
            <span className="font-mono text-xs text-foreground break-all">
              {results.decoded || results.decodedAnalog?.join(", ")}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 py-2">
            <span className="text-muted-foreground">Status:</span>
            <span className={`font-medium ${isSuccessful ? "text-chart-2" : "text-destructive"}`}>
              {isSuccessful ? "✓ Success" : "✗ Error Detected"}
            </span>
          </div>

          {results.metrics && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="text-xs font-semibold text-foreground">Performance Metrics</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-muted-foreground">Bit Rate:</span>
                <span className="text-foreground">{results.metrics.bitRate}</span>

                <span className="text-muted-foreground">Signal Levels:</span>
                <span className="text-foreground">{results.metrics.signalLevels}</span>

                <span className="text-muted-foreground">Bandwidth:</span>
                <span className="text-foreground">{results.metrics.bandwidth}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

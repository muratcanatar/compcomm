"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type TransmissionMode = "digital-to-digital" | "digital-to-analog" | "analog-to-digital" | "analog-to-analog"

interface DataInputProps {
  mode: TransmissionMode
  value: string
  onChange: (value: string) => void
}

export function DataInput({ mode, value, onChange }: DataInputProps) {
  const isDigitalInput = mode === "digital-to-digital" || mode === "digital-to-analog"

  return (
    <div className="space-y-2">
      <Label htmlFor="input-data" className="text-sm font-semibold text-foreground">
        Input Data
      </Label>
      {isDigitalInput ? (
        <div className="space-y-2">
          <Input
            id="input-data"
            placeholder="Enter binary data (e.g., 10110100)"
            value={value}
            onChange={(e) => {
              const filtered = e.target.value.replace(/[^01]/g, "")
              onChange(filtered)
            }}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">Enter binary digits (0s and 1s only)</p>
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            id="input-data"
            placeholder="Enter analog signal values (e.g., 0.5, 0.8, 0.3, 0.9...)"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="font-mono min-h-[100px]"
          />
          <p className="text-xs text-muted-foreground">Enter comma-separated values (0.0 to 1.0)</p>
        </div>
      )}
    </div>
  )
}

"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type TransmissionMode = "digital-to-digital" | "digital-to-analog" | "analog-to-digital" | "analog-to-analog"

interface AlgorithmSelectorProps {
  mode: TransmissionMode
  value: string
  onChange: (value: string) => void
}

const algorithms = {
  "digital-to-digital": [
    { value: "nrz-l", label: "NRZ-L (Non-Return to Zero Level)" },
    { value: "nrz-i", label: "NRZ-I (Non-Return to Zero Inverted)" },
    { value: "manchester", label: "Manchester Encoding" },
    { value: "diff-manchester", label: "Differential Manchester" },
    { value: "ami", label: "AMI (Alternate Mark Inversion)" },
  ],
  "digital-to-analog": [
    { value: "ask", label: "ASK (Amplitude Shift Keying)" },
    { value: "fsk", label: "FSK (Frequency Shift Keying)" },
    { value: "psk", label: "PSK (Phase Shift Keying)" },
    { value: "qam", label: "QAM (Quadrature Amplitude Modulation)" },
  ],
  "analog-to-digital": [
    { value: "pcm", label: "PCM (Pulse Code Modulation)" },
    { value: "delta", label: "Delta Modulation" },
    { value: "adaptive-delta", label: "Adaptive Delta Modulation" },
  ],
  "analog-to-analog": [
    { value: "am", label: "AM (Amplitude Modulation)" },
    { value: "fm", label: "FM (Frequency Modulation)" },
    { value: "pm", label: "PM (Phase Modulation)" },
  ],
}

export function AlgorithmSelector({ mode, value, onChange }: AlgorithmSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="algorithm" className="text-sm font-semibold text-foreground">
        Algorithm Selection
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="algorithm">
          <SelectValue placeholder="Select an algorithm" />
        </SelectTrigger>
        <SelectContent>
          {algorithms[mode].map((algo) => (
            <SelectItem key={algo.value} value={algo.value}>
              {algo.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

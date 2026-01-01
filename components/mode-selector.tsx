"use client"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

type TransmissionMode = "digital-to-digital" | "digital-to-analog" | "analog-to-digital" | "analog-to-analog"

interface ModeSelectorProps {
  value: TransmissionMode
  onChange: (value: TransmissionMode) => void
}

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold text-foreground">Transmission Mode</Label>
      <RadioGroup value={value} onValueChange={onChange as (value: string) => void}>
        <div className="flex items-center space-x-2 rounded-md border border-border p-3 hover:bg-accent/50 transition-colors">
          <RadioGroupItem value="digital-to-digital" id="digital-to-digital" />
          <Label htmlFor="digital-to-digital" className="flex-1 cursor-pointer text-sm">
            <span className="font-medium text-foreground">Digital-to-Digital</span>
            <span className="block text-xs text-muted-foreground mt-0.5">Encoding & Decoding</span>
          </Label>
        </div>

        <div className="flex items-center space-x-2 rounded-md border border-border p-3 hover:bg-accent/50 transition-colors">
          <RadioGroupItem value="digital-to-analog" id="digital-to-analog" />
          <Label htmlFor="digital-to-analog" className="flex-1 cursor-pointer text-sm">
            <span className="font-medium text-foreground">Digital-to-Analog</span>
            <span className="block text-xs text-muted-foreground mt-0.5">Modulation & Demodulation</span>
          </Label>
        </div>

        <div className="flex items-center space-x-2 rounded-md border border-border p-3 hover:bg-accent/50 transition-colors">
          <RadioGroupItem value="analog-to-digital" id="analog-to-digital" />
          <Label htmlFor="analog-to-digital" className="flex-1 cursor-pointer text-sm">
            <span className="font-medium text-foreground">Analog-to-Digital</span>
            <span className="block text-xs text-muted-foreground mt-0.5">Sampling & Quantization</span>
          </Label>
        </div>

        <div className="flex items-center space-x-2 rounded-md border border-border p-3 hover:bg-accent/50 transition-colors">
          <RadioGroupItem value="analog-to-analog" id="analog-to-analog" />
          <Label htmlFor="analog-to-analog" className="flex-1 cursor-pointer text-sm">
            <span className="font-medium text-foreground">Analog-to-Analog</span>
            <span className="block text-xs text-muted-foreground mt-0.5">Analog Modulation</span>
          </Label>
        </div>
      </RadioGroup>
    </div>
  )
}

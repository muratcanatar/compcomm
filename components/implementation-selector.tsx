"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type TransmissionImplementation = "original" | "chat" | "gemini"

interface ImplementationSelectorProps {
  value: TransmissionImplementation
  onChange: (value: TransmissionImplementation) => void
}

const implementationOptions: { value: TransmissionImplementation; label: string; hint: string }[] = [
  { value: "original", label: "Student Code", hint: "My manual implementation" },
  { value: "chat", label: "ChatGPT AI", hint: "AI-generated variant #1" },
  { value: "gemini", label: "Gemini AI", hint: "AI-generated variant #2" },
]

export function ImplementationSelector({ value, onChange }: ImplementationSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="implementation" className="text-sm font-semibold text-foreground">
        Implementation Source
      </Label>
      <Select value={value} onValueChange={(val) => onChange(val as TransmissionImplementation)}>
        <SelectTrigger id="implementation">
          <SelectValue placeholder="Select implementation" />
        </SelectTrigger>
        <SelectContent>
          {implementationOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex flex-col">
                <span>{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.hint}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModeSelector } from "@/components/mode-selector"
import { AlgorithmSelector } from "@/components/algorithm-selector"
import { DataInput } from "@/components/data-input"
import { VisualizationPanel } from "@/components/visualization-panel"
import { ResultsPanel } from "@/components/results-panel"
import { ComparisonPanel } from "@/components/comparison-panel"
import { processTransmission } from "@/lib/transmission"
import { processTransmission as processTransmissionChat } from "@/lib/transmission_chat"
import { processTransmission as processTransmissionGemini } from "@/lib/transmission_gemini"
import { ImplementationSelector, type TransmissionImplementation } from "@/components/implementation-selector"
import { ArrowRight, Cpu } from "lucide-react"

type TransmissionMode = "digital-to-digital" | "digital-to-analog" | "analog-to-digital" | "analog-to-analog"

interface TransmissionResult {
  original?: string
  originalAnalog?: number[]
  encoded?: number[]
  decoded?: string
  decodedAnalog?: number[]
  modulated?: number[]
  demodulated?: number[]
  demodulatedSignal?: number[]
  metrics?: {
    bitRate: string
    signalLevels: string
    bandwidth: string
  }
}

const implementationLabels: Record<TransmissionImplementation, string> = {
  original: "Student Code",
  chat: "ChatGPT AI",
  gemini: "Gemini AI",
}

export default function Home() {
  const [mode, setMode] = useState<TransmissionMode>("digital-to-digital")
  const [encodingAlgorithm, setEncodingAlgorithm] = useState("")
  const [inputData, setInputData] = useState("")
  const [implementation, setImplementation] = useState<TransmissionImplementation>("original")
  const [results, setResults] = useState<
    Record<TransmissionImplementation, { data: TransmissionResult; durationMs: number }>
  >()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleTransmit = async () => {
    if (!inputData || !encodingAlgorithm) {
      alert("Lütfen veri ve algoritma seçin")
      return
    }

    setIsProcessing(true)

    // Simulate processing delay for visual effect
    await new Promise((resolve) => setTimeout(resolve, 800))

    const runWithTiming = (fn: () => TransmissionResult | null) => {
      const start = performance.now()
      const data = fn()
      return { data: data as TransmissionResult, durationMs: performance.now() - start }
    }

    const newResults = {
      original: runWithTiming(() => processTransmission(mode, encodingAlgorithm, inputData)),
      chat: runWithTiming(() => processTransmissionChat(mode, encodingAlgorithm, inputData)),
      gemini: runWithTiming(() => processTransmissionGemini(mode, encodingAlgorithm, inputData)),
    }

    setResults(newResults)
    setIsProcessing(false)
  }

  const handleReset = () => {
    setInputData("")
    setResults(undefined)
  }

  const selectedResult = results?.[implementation]?.data
  const selectedDuration = results?.[implementation]?.durationMs
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Cpu className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Communication Simulator</h1>
              <p className="text-sm text-muted-foreground">BLG 337E - Encoding and Modulation Techniques</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-foreground">Transmission Configuration</h2>

              <div className="space-y-6">
                <ModeSelector value={mode} onChange={setMode} />

                <ImplementationSelector value={implementation} onChange={setImplementation} />

                <AlgorithmSelector mode={mode} value={encodingAlgorithm} onChange={setEncodingAlgorithm} />

                <DataInput mode={mode} value={inputData} onChange={setInputData} />

                <div className="flex gap-3">
                  <Button
                    onClick={handleTransmit}
                    disabled={isProcessing || !inputData || !encodingAlgorithm}
                    className="flex-1"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <span className="animate-pulse">Processing...</span>
                      </>
                    ) : (
                      <>
                        Transmit Data
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <Button onClick={handleReset} variant="outline" size="lg">
                    Reset
                  </Button>
                </div>
              </div>
            </Card>

            {selectedResult && (
              <ResultsPanel
                mode={mode}
                algorithm={encodingAlgorithm}
                results={selectedResult}
                implementationLabel={implementationLabels[implementation]}
                durationMs={selectedDuration}
              />
            )}

            {results && <ComparisonPanel results={results} mode={mode} />}
          </div>

          {/* Right Panel - Visualization */}
          <div className="lg:col-span-7">
            <VisualizationPanel
              mode={mode}
              algorithm={encodingAlgorithm}
              inputData={inputData}
              results={selectedResult}
              isProcessing={isProcessing}
            />
          </div>
        </div>

        {/* Information Section */}
        <Card className="mt-8 p-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="digital-digital">Digital-to-Digital</TabsTrigger>
              <TabsTrigger value="digital-analog">Digital-to-Analog</TabsTrigger>
              <TabsTrigger value="analog">Analog Conversion</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-3">
              <h3 className="text-lg font-semibold text-foreground">About This Simulator</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This simulator demonstrates various encoding and modulation techniques used in computer communication.
                It allows you to experiment with different transmission modes and algorithms to understand how data is
                converted and transmitted between systems.
              </p>
            </TabsContent>

            <TabsContent value="digital-digital" className="mt-4 space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Digital-to-Digital Encoding</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Digital-to-digital encoding converts digital data into digital signals. Common techniques include:
                <br />• <strong>NRZ-L:</strong> Non-Return to Zero Level - voltage level determines bit value
                <br />• <strong>NRZ-I:</strong> Non-Return to Zero Inverted - transition indicates bit
                <br />• <strong>Manchester:</strong> Transition in the middle of each bit period
                <br />• <strong>Differential Manchester:</strong> Transition at the start indicates binary 0
                <br />• <strong>AMI:</strong> Alternate Mark Inversion - alternating polarity for 1s
              </p>
            </TabsContent>

            <TabsContent value="digital-analog" className="mt-4 space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Digital-to-Analog Modulation</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Digital-to-analog modulation converts digital data into analog signals:
                <br />• <strong>ASK:</strong> Amplitude Shift Keying - varies amplitude
                <br />• <strong>FSK:</strong> Frequency Shift Keying - varies frequency
                <br />• <strong>PSK:</strong> Phase Shift Keying - varies phase
                <br />• <strong>QAM:</strong> Quadrature Amplitude Modulation - varies both amplitude and phase
              </p>
            </TabsContent>

            <TabsContent value="analog" className="mt-4 space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Analog Conversion Techniques</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong>Analog-to-Digital:</strong> PCM (Pulse Code Modulation), Delta Modulation
                <br />
                <strong>Analog-to-Analog:</strong> AM (Amplitude Modulation), FM (Frequency Modulation), PM (Phase
                Modulation)
              </p>
            </TabsContent>
          </Tabs>
        </Card>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Istanbul Technical University - BLG 337E Assignment 1</p>
          <p className="mt-1">Encoding and Modulation Techniques Simulator</p>
        </div>
      </footer>
    </div>
  )
}

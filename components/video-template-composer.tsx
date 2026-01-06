"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Copy, 
  Check, 
  Lock, 
  Unlock, 
  ChevronUp, 
  ChevronDown,
  Eye,
  EyeOff,
  RotateCcw,
  Download
} from "lucide-react"

interface VideoLayer {
  id: string
  name: string
  width: number
  height: number
  x: number
  y: number
  aspectLocked: boolean
  aspectRatio: number
  visible: boolean
  zIndex: number
}

interface CanvasSize {
  width: number
  height: number
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null

const HANDLE_SIZE = 10
const MIN_SIZE = 50

export function VideoTemplateComposer() {
  const [templateImage, setTemplateImage] = useState<string | null>(null)
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 504, height: 846 })
  const [videoLayers, setVideoLayers] = useState<VideoLayer[]>([])
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null)
  const [draggingLayer, setDraggingLayer] = useState<string | null>(null)
  const [resizingLayer, setResizingLayer] = useState<string | null>(null)
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [layerStart, setLayerStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [ffmpegCommand, setFfmpegCommand] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [templateOpacity, setTemplateOpacity] = useState(0.6)
  const [showGrid, setShowGrid] = useState(false)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [gridSize, setGridSize] = useState(20)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const templateImageRef = useRef<HTMLImageElement | null>(null)

  // Preload template image
  useEffect(() => {
    if (templateImage) {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        templateImageRef.current = img
      }
      img.src = templateImage
    } else {
      templateImageRef.current = null
    }
  }, [templateImage])

  // Snap value to grid
  const snapValue = useCallback((value: number) => {
    if (!snapToGrid) return value
    return Math.round(value / gridSize) * gridSize
  }, [snapToGrid, gridSize])

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)

    // Fill with light background
    ctx.fillStyle = "#f5f5f5"
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = "rgba(0, 0, 0, 0.08)"
      ctx.lineWidth = 1
      for (let x = 0; x <= canvasSize.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvasSize.height)
        ctx.stroke()
      }
      for (let y = 0; y <= canvasSize.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvasSize.width, y)
        ctx.stroke()
      }
    }

    // Sort layers by zIndex and draw visible ones
    const sortedLayers = [...videoLayers].sort((a, b) => a.zIndex - b.zIndex)
    
    sortedLayers.forEach((layer) => {
      if (!layer.visible) return

      // Shadow for depth
      ctx.shadowColor = "rgba(0, 0, 0, 0.15)"
      ctx.shadowBlur = 8
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 2

      // Placeholder background (gradient)
      const gradient = ctx.createLinearGradient(layer.x, layer.y, layer.x, layer.y + layer.height)
      gradient.addColorStop(0, "#8b5cf6")
      gradient.addColorStop(1, "#6d28d9")
      ctx.fillStyle = gradient
      ctx.fillRect(layer.x, layer.y, layer.width, layer.height)

      // Reset shadow
      ctx.shadowColor = "transparent"
      ctx.shadowBlur = 0

      // Border for selected layer
      if (selectedLayer === layer.id) {
        ctx.strokeStyle = "#f59e0b"
        ctx.lineWidth = 3
        ctx.strokeRect(layer.x, layer.y, layer.width, layer.height)

        // Draw resize handles
        const handles = getResizeHandles(layer)
        ctx.fillStyle = "#f59e0b"
        handles.forEach(handle => {
          ctx.fillRect(handle.x, handle.y, HANDLE_SIZE, HANDLE_SIZE)
        })
      } else {
        ctx.strokeStyle = "#d4d4d8"
        ctx.lineWidth = 1
        ctx.strokeRect(layer.x, layer.y, layer.width, layer.height)
      }

      // Draw layer name
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 14px Inter, system-ui, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(layer.name, layer.x + layer.width / 2, layer.y + layer.height / 2 - 12)

      // Draw dimensions
      ctx.font = "12px Inter, system-ui, sans-serif"
      ctx.fillText(`${Math.round(layer.width)}×${Math.round(layer.height)}`, layer.x + layer.width / 2, layer.y + layer.height / 2 + 8)

      // Draw lock icon if aspect locked
      if (layer.aspectLocked) {
        ctx.font = "10px Inter, system-ui, sans-serif"
        ctx.fillText("🔒", layer.x + layer.width / 2, layer.y + layer.height / 2 + 24)
      }
    })

    // Draw template image with opacity on top
    if (templateImageRef.current) {
      ctx.globalAlpha = templateOpacity
      ctx.drawImage(templateImageRef.current, 0, 0, canvasSize.width, canvasSize.height)
      ctx.globalAlpha = 1.0
    }
  }, [templateImage, canvasSize, videoLayers, selectedLayer, templateOpacity, showGrid, gridSize])

  // Get resize handle positions for a layer
  const getResizeHandles = (layer: VideoLayer) => {
    const halfHandle = HANDLE_SIZE / 2
    return [
      { type: 'nw' as const, x: layer.x - halfHandle, y: layer.y - halfHandle },
      { type: 'n' as const, x: layer.x + layer.width / 2 - halfHandle, y: layer.y - halfHandle },
      { type: 'ne' as const, x: layer.x + layer.width - halfHandle, y: layer.y - halfHandle },
      { type: 'e' as const, x: layer.x + layer.width - halfHandle, y: layer.y + layer.height / 2 - halfHandle },
      { type: 'se' as const, x: layer.x + layer.width - halfHandle, y: layer.y + layer.height - halfHandle },
      { type: 's' as const, x: layer.x + layer.width / 2 - halfHandle, y: layer.y + layer.height - halfHandle },
      { type: 'sw' as const, x: layer.x - halfHandle, y: layer.y + layer.height - halfHandle },
      { type: 'w' as const, x: layer.x - halfHandle, y: layer.y + layer.height / 2 - halfHandle },
    ]
  }

  // Check if point is on a resize handle
  const getHandleAtPoint = (layer: VideoLayer, x: number, y: number): ResizeHandle => {
    const handles = getResizeHandles(layer)
    for (const handle of handles) {
      if (x >= handle.x && x <= handle.x + HANDLE_SIZE &&
          y >= handle.y && y <= handle.y + HANDLE_SIZE) {
        return handle.type
      }
    }
    return null
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        setCanvasSize({ width: img.width, height: img.height })
        setTemplateImage(event.target?.result as string)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const addVideoLayer = () => {
    const maxZIndex = videoLayers.length > 0 ? Math.max(...videoLayers.map(l => l.zIndex)) : 0
    const newLayer: VideoLayer = {
      id: `video-${Date.now()}`,
      name: `Video ${videoLayers.length + 1}`,
      width: 340,
      height: 340,
      x: snapValue(20 + (videoLayers.length % 3) * 30),
      y: snapValue(20 + (videoLayers.length % 3) * 30),
      aspectLocked: false,
      aspectRatio: 1,
      visible: true,
      zIndex: maxZIndex + 1,
    }
    setVideoLayers([...videoLayers, newLayer])
    setSelectedLayer(newLayer.id)
  }

  const duplicateVideoLayer = (id: string) => {
    const layer = videoLayers.find(l => l.id === id)
    if (!layer) return

    const maxZIndex = Math.max(...videoLayers.map(l => l.zIndex))
    const newLayer: VideoLayer = {
      ...layer,
      id: `video-${Date.now()}`,
      name: `${layer.name} (copy)`,
      x: snapValue(Math.min(layer.x + 30, canvasSize.width - layer.width)),
      y: snapValue(Math.min(layer.y + 30, canvasSize.height - layer.height)),
      zIndex: maxZIndex + 1,
    }
    setVideoLayers([...videoLayers, newLayer])
    setSelectedLayer(newLayer.id)
  }

  const removeVideoLayer = (id: string) => {
    setVideoLayers(videoLayers.filter((layer) => layer.id !== id))
    if (selectedLayer === id) setSelectedLayer(null)
  }

  const updateVideoLayer = (id: string, updates: Partial<VideoLayer>) => {
    setVideoLayers(videoLayers.map((layer) => {
      if (layer.id !== id) return layer
      
      const updatedLayer = { ...layer, ...updates }
      
      // Handle aspect ratio locking for width/height changes
      if (layer.aspectLocked && updates.width !== undefined && updates.height === undefined) {
        updatedLayer.height = Math.round(updates.width / layer.aspectRatio)
      } else if (layer.aspectLocked && updates.height !== undefined && updates.width === undefined) {
        updatedLayer.width = Math.round(updates.height * layer.aspectRatio)
      }
      
      // Update aspect ratio when locking
      if (updates.aspectLocked === true) {
        updatedLayer.aspectRatio = layer.width / layer.height
      }
      
      return updatedLayer
    }))
  }

  const moveLayerUp = (id: string) => {
    const layer = videoLayers.find(l => l.id === id)
    if (!layer) return
    
    const higherLayers = videoLayers.filter(l => l.zIndex > layer.zIndex)
    if (higherLayers.length === 0) return
    
    const nextHigher = higherLayers.reduce((min, l) => l.zIndex < min.zIndex ? l : min)
    
    setVideoLayers(videoLayers.map(l => {
      if (l.id === id) return { ...l, zIndex: nextHigher.zIndex }
      if (l.id === nextHigher.id) return { ...l, zIndex: layer.zIndex }
      return l
    }))
  }

  const moveLayerDown = (id: string) => {
    const layer = videoLayers.find(l => l.id === id)
    if (!layer) return
    
    const lowerLayers = videoLayers.filter(l => l.zIndex < layer.zIndex)
    if (lowerLayers.length === 0) return
    
    const nextLower = lowerLayers.reduce((max, l) => l.zIndex > max.zIndex ? l : max)
    
    setVideoLayers(videoLayers.map(l => {
      if (l.id === id) return { ...l, zIndex: nextLower.zIndex }
      if (l.id === nextLower.id) return { ...l, zIndex: layer.zIndex }
      return l
    }))
  }

  const resetLayer = (id: string) => {
    updateVideoLayer(id, {
      width: 340,
      height: 340,
      x: 20,
      y: 20,
      aspectLocked: false,
      aspectRatio: 1
    })
  }

  const getMousePosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvasSize.width / rect.width
    const scaleY = canvasSize.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePosition(e)

    // Check if clicking on a resize handle of selected layer
    if (selectedLayer) {
      const layer = videoLayers.find(l => l.id === selectedLayer)
      if (layer) {
        const handle = getHandleAtPoint(layer, x, y)
        if (handle) {
          setResizingLayer(selectedLayer)
          setResizeHandle(handle)
          setDragStart({ x, y })
          setLayerStart({ x: layer.x, y: layer.y, width: layer.width, height: layer.height })
          return
        }
      }
    }

    // Find clicked layer (reverse order by zIndex to prioritize top layers)
    const sortedLayers = [...videoLayers].sort((a, b) => b.zIndex - a.zIndex)
    const clickedLayer = sortedLayers.find((layer) => {
      return layer.visible && x >= layer.x && x <= layer.x + layer.width && y >= layer.y && y <= layer.y + layer.height
    })

    if (clickedLayer) {
      setSelectedLayer(clickedLayer.id)
      setDraggingLayer(clickedLayer.id)
      setDragStart({ x: x - clickedLayer.x, y: y - clickedLayer.y })
    } else {
      setSelectedLayer(null)
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePosition(e)

    // Handle resizing
    if (resizingLayer && resizeHandle) {
      const layer = videoLayers.find(l => l.id === resizingLayer)
      if (!layer) return

      let newX = layerStart.x
      let newY = layerStart.y
      let newWidth = layerStart.width
      let newHeight = layerStart.height

      const dx = x - dragStart.x
      const dy = y - dragStart.y

      // Calculate new dimensions based on handle
      switch (resizeHandle) {
        case 'nw':
          newWidth = Math.max(MIN_SIZE, layerStart.width - dx)
          newHeight = layer.aspectLocked ? newWidth / layer.aspectRatio : Math.max(MIN_SIZE, layerStart.height - dy)
          newX = layerStart.x + layerStart.width - newWidth
          newY = layerStart.y + layerStart.height - newHeight
          break
        case 'n':
          newHeight = Math.max(MIN_SIZE, layerStart.height - dy)
          if (layer.aspectLocked) newWidth = newHeight * layer.aspectRatio
          newY = layerStart.y + layerStart.height - newHeight
          break
        case 'ne':
          newWidth = Math.max(MIN_SIZE, layerStart.width + dx)
          newHeight = layer.aspectLocked ? newWidth / layer.aspectRatio : Math.max(MIN_SIZE, layerStart.height - dy)
          newY = layerStart.y + layerStart.height - newHeight
          break
        case 'e':
          newWidth = Math.max(MIN_SIZE, layerStart.width + dx)
          if (layer.aspectLocked) newHeight = newWidth / layer.aspectRatio
          break
        case 'se':
          newWidth = Math.max(MIN_SIZE, layerStart.width + dx)
          newHeight = layer.aspectLocked ? newWidth / layer.aspectRatio : Math.max(MIN_SIZE, layerStart.height + dy)
          break
        case 's':
          newHeight = Math.max(MIN_SIZE, layerStart.height + dy)
          if (layer.aspectLocked) newWidth = newHeight * layer.aspectRatio
          break
        case 'sw':
          newWidth = Math.max(MIN_SIZE, layerStart.width - dx)
          newHeight = layer.aspectLocked ? newWidth / layer.aspectRatio : Math.max(MIN_SIZE, layerStart.height + dy)
          newX = layerStart.x + layerStart.width - newWidth
          break
        case 'w':
          newWidth = Math.max(MIN_SIZE, layerStart.width - dx)
          if (layer.aspectLocked) newHeight = newWidth / layer.aspectRatio
          newX = layerStart.x + layerStart.width - newWidth
          break
      }

      // Constrain to canvas bounds
      newX = Math.max(0, Math.min(canvasSize.width - newWidth, newX))
      newY = Math.max(0, Math.min(canvasSize.height - newHeight, newY))

      updateVideoLayer(resizingLayer, {
        x: snapValue(newX),
        y: snapValue(newY),
        width: snapValue(newWidth),
        height: snapValue(newHeight)
      })
      return
    }

    // Handle dragging
    if (draggingLayer) {
      const newX = x - dragStart.x
      const newY = y - dragStart.y
      const layer = videoLayers.find(l => l.id === draggingLayer)
      if (!layer) return

      updateVideoLayer(draggingLayer, {
        x: snapValue(Math.max(0, Math.min(canvasSize.width - layer.width, newX))),
        y: snapValue(Math.max(0, Math.min(canvasSize.height - layer.height, newY))),
      })
    }

    // Update cursor based on hover
    const canvas = canvasRef.current
    if (!canvas) return

    if (selectedLayer) {
      const layer = videoLayers.find(l => l.id === selectedLayer)
      if (layer) {
        const handle = getHandleAtPoint(layer, x, y)
        if (handle) {
          const cursors: Record<ResizeHandle, string> = {
            nw: 'nwse-resize',
            n: 'ns-resize',
            ne: 'nesw-resize',
            e: 'ew-resize',
            se: 'nwse-resize',
            s: 'ns-resize',
            sw: 'nesw-resize',
            w: 'ew-resize',
            null: 'default'
          }
          canvas.style.cursor = cursors[handle] || 'default'
          return
        }
      }
    }
    canvas.style.cursor = 'move'
  }

  const handleCanvasMouseUp = () => {
    setDraggingLayer(null)
    setResizingLayer(null)
    setResizeHandle(null)
  }

  const generateFFmpegCommand = () => {
    const visibleLayers = videoLayers.filter(l => l.visible).sort((a, b) => a.zIndex - b.zIndex)
    
    if (visibleLayers.length === 0) {
      setFfmpegCommand("# Add at least one visible video layer first")
      return
    }

    let command = "ffmpeg \\\n"

    // Input files
    visibleLayers.forEach((layer) => {
      command += `  -i "${layer.name.toLowerCase().replace(/\s+/g, "_")}.mp4" \\\n`
    })
    command += '  -i "template.png" \\\n'

    // Filter complex
    command += '  -filter_complex "\n'

    // Create base
    command += `    color=size=${canvasSize.width}x${canvasSize.height}:color=black:d=1[base];\n\n`

    // Scale videos
    visibleLayers.forEach((layer, idx) => {
      command += `    [${idx}:v]scale=${Math.round(layer.width)}:${Math.round(layer.height)}:force_original_aspect_ratio=decrease,\n`
      command += `    pad=${Math.round(layer.width)}:${Math.round(layer.height)}:(ow-iw)/2:(oh-ih)/2[v${idx}];\n\n`
    })

    // Overlay videos
    let currentBase = "base"
    visibleLayers.forEach((layer, idx) => {
      const nextBase = idx === visibleLayers.length - 1 ? "videos" : `tmp${idx}`
      command += `    [${currentBase}][v${idx}]overlay=${Math.round(layer.x)}:${Math.round(layer.y)}[${nextBase}];\n`
      currentBase = nextBase
    })

    // Final PNG overlay
    command += `\n    [videos][${visibleLayers.length}:v]overlay=0:0\n`
    command += '  " \\\n'

    // Output options
    command += "  -c:v libx264 -pix_fmt yuv420p -crf 18 -preset medium \\\n"
    command += "  -shortest \\\n"
    command += '  "output.mp4"'

    setFfmpegCommand(command)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(ffmpegCommand)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadCommand = () => {
    const blob = new Blob([ffmpegCommand], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ffmpeg_command.sh'
    a.click()
    URL.revokeObjectURL(url)
  }

  const sortedLayersForSidebar = [...videoLayers].sort((a, b) => b.zIndex - a.zIndex)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-[420px] border-r border-gray-200 bg-white flex flex-col shadow-sm">
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FFmpeg Template Composer</h1>
              <p className="text-sm text-gray-500 mt-1">Create video templates visually</p>
            </div>

            {/* Template Upload */}
            <Card className="p-4 space-y-3 bg-gray-50 border-gray-200">
              <Label className="text-gray-700 font-medium">Template PNG</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full">
                {templateImage ? "Change Template" : "Upload PNG"}
              </Button>
              {templateImage && (
                <>
                  <p className="text-xs text-gray-500">
                    Canvas: {canvasSize.width} × {canvasSize.height}px
                  </p>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Template Opacity: {Math.round(templateOpacity * 100)}%</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={templateOpacity * 100}
                      onChange={(e) => setTemplateOpacity(Number(e.target.value) / 100)}
                      className="w-full accent-amber-500"
                    />
                  </div>
                </>
              )}
            </Card>

            {/* Canvas Options */}
            <Card className="p-4 space-y-3 bg-gray-50 border-gray-200">
              <Label className="text-gray-700 font-medium">Canvas Options</Label>
              <div className="flex gap-2">
                <Button
                  variant={showGrid ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowGrid(!showGrid)}
                  className={showGrid ? "bg-amber-500 hover:bg-amber-600" : ""}
                >
                  Grid
                </Button>
                <Button
                  variant={snapToGrid ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSnapToGrid(!snapToGrid)}
                  className={snapToGrid ? "bg-amber-500 hover:bg-amber-600" : ""}
                >
                  Snap
                </Button>
                <Input
                  type="number"
                  value={gridSize}
                  onChange={(e) => setGridSize(Math.max(5, Number(e.target.value)))}
                  className="w-20 h-8 text-sm"
                  min={5}
                />
              </div>
            </Card>

            {/* Video Layers */}
            <Card className="p-4 space-y-3 bg-gray-50 border-gray-200">
              <div className="flex items-center justify-between">
                <Label className="text-gray-700 font-medium">Video Layers ({videoLayers.length})</Label>
                <Button onClick={addVideoLayer} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Video
                </Button>
              </div>

              <div className="space-y-2">
                {sortedLayersForSidebar.map((layer) => (
                  <Card
                    key={layer.id}
                    className={`p-3 space-y-3 cursor-pointer transition-all bg-white border-gray-200 hover:border-gray-300 ${
                      selectedLayer === layer.id ? "ring-2 ring-amber-500 border-amber-300" : ""
                    } ${!layer.visible ? "opacity-50" : ""}`}
                    onClick={() => setSelectedLayer(layer.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <Input
                          value={layer.name}
                          onChange={(e) => updateVideoLayer(layer.id, { name: e.target.value })}
                          className="h-7 text-sm font-medium"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            updateVideoLayer(layer.id, { visible: !layer.visible })
                          }}
                          title={layer.visible ? "Hide" : "Show"}
                        >
                          {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            duplicateVideoLayer(layer.id)
                          }}
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeVideoLayer(layer.id)
                          }}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-500">Width</Label>
                        <Input
                          type="number"
                          value={Math.round(layer.width)}
                          onChange={(e) => updateVideoLayer(layer.id, { width: Number(e.target.value) || MIN_SIZE })}
                          className="h-7 text-sm"
                          onClick={(e) => e.stopPropagation()}
                          min={MIN_SIZE}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Height</Label>
                        <Input
                          type="number"
                          value={Math.round(layer.height)}
                          onChange={(e) => updateVideoLayer(layer.id, { height: Number(e.target.value) || MIN_SIZE })}
                          className="h-7 text-sm"
                          onClick={(e) => e.stopPropagation()}
                          min={MIN_SIZE}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-500">X Position</Label>
                        <Input
                          type="number"
                          value={Math.round(layer.x)}
                          onChange={(e) => updateVideoLayer(layer.id, { x: Number(e.target.value) || 0 })}
                          className="h-7 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Y Position</Label>
                        <Input
                          type="number"
                          value={Math.round(layer.y)}
                          onChange={(e) => updateVideoLayer(layer.id, { y: Number(e.target.value) || 0 })}
                          className="h-7 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <Button
                          variant={layer.aspectLocked ? "default" : "outline"}
                          size="sm"
                          className={`h-7 ${layer.aspectLocked ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            updateVideoLayer(layer.id, { aspectLocked: !layer.aspectLocked })
                          }}
                          title={layer.aspectLocked ? "Unlock aspect ratio" : "Lock aspect ratio"}
                        >
                          {layer.aspectLocked ? <Lock className="w-3 h-3 mr-1" /> : <Unlock className="w-3 h-3 mr-1" />}
                          Aspect
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            resetLayer(layer.id)
                          }}
                          title="Reset"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            moveLayerUp(layer.id)
                          }}
                          title="Move up (front)"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            moveLayerDown(layer.id)
                          }}
                          title="Move down (back)"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

                {videoLayers.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No videos added yet</p>
                )}
              </div>
            </Card>

            {/* Generate Button */}
            <Button onClick={generateFFmpegCommand} className="w-full bg-amber-500 hover:bg-amber-600 text-white" size="lg">
              Generate FFmpeg Command
            </Button>

            {/* FFmpeg Output */}
            {ffmpegCommand && (
              <Card className="p-4 space-y-3 bg-gray-50 border-gray-200">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-700 font-medium">FFmpeg Command</Label>
                  <div className="flex gap-2">
                    <Button onClick={downloadCommand} size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button onClick={copyToClipboard} size="sm" variant="outline">
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-md overflow-x-auto whitespace-pre-wrap font-mono">{ffmpegCommand}</pre>
              </Card>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex items-center justify-center bg-gray-100 p-8 overflow-auto">
        <div className="relative">
          {!templateImage && videoLayers.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-gray-400 text-lg">Upload a PNG template to start</p>
                <p className="text-gray-300 text-sm mt-1">or add video layers to compose</p>
              </div>
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="border border-gray-300 rounded-lg shadow-lg cursor-move bg-white"
            style={{
              maxHeight: "85vh",
              maxWidth: "100%",
              width: "auto",
              height: "auto",
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
        </div>
      </div>
    </div>
  )
}

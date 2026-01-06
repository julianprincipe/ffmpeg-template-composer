# FFmpeg Template Composer

A visual tool to create FFmpeg video composition commands. Design your video layout by dragging and resizing video placeholders, then generate the corresponding FFmpeg command.

![FFmpeg Template Composer](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8)

## Features

- 🎨 **Visual Canvas** - Drag and drop video layers on an interactive canvas
- 📐 **Resize Handles** - 8-point resize handles for precise control
- 🔒 **Aspect Ratio Lock** - Lock/unlock aspect ratio per video layer
- 📋 **Duplicate Layers** - Quickly duplicate existing video configurations
- 👁️ **Visibility Toggle** - Show/hide layers without deleting them
- 📊 **Z-Index Control** - Move layers up/down in the stack
- 🔲 **Grid & Snap** - Optional grid overlay with snap-to-grid functionality
- 🖼️ **Template Overlay** - Upload a PNG template with adjustable opacity
- 📝 **FFmpeg Generation** - Auto-generate FFmpeg filter_complex commands
- 💾 **Export Options** - Copy to clipboard or download as .sh file

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ffmpeg-template-composer.git
cd ffmpeg-template-composer

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Upload Template (Optional)**: Click "Upload PNG" to load a template image that will overlay on top of your video composition
2. **Add Video Layers**: Click "Add Video" to create video placeholders
3. **Position & Resize**: 
   - Drag layers to position them
   - Use the yellow corner/edge handles to resize
   - Lock aspect ratio with the "Aspect" button
4. **Configure**: Adjust width, height, X/Y position via input fields for precise values
5. **Generate Command**: Click "Generate FFmpeg Command" to create the shell command
6. **Export**: Copy the command or save it as a .sh file

## Generated FFmpeg Command

The tool generates a complete FFmpeg command with:
- Multiple video inputs
- Proper scaling with aspect ratio preservation
- Overlay positioning
- PNG template compositing
- H.264 output encoding

Example output:
```bash
ffmpeg \
  -i "video_1.mp4" \
  -i "video_2.mp4" \
  -i "template.png" \
  -filter_complex "
    color=size=1080x1920:color=black:d=1[base];
    [0:v]scale=540:540:force_original_aspect_ratio=decrease,
    pad=540:540:(ow-iw)/2:(oh-ih)/2[v0];
    [1:v]scale=540:540:force_original_aspect_ratio=decrease,
    pad=540:540:(ow-iw)/2:(oh-ih)/2[v1];
    [base][v0]overlay=20:20[tmp0];
    [tmp0][v1]overlay=520:20[videos];
    [videos][2:v]overlay=0:0
  " \
  -c:v libx264 -pix_fmt yuv420p -crf 18 -preset medium \
  -shortest \
  "output.mp4"
```

## Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Icons**: Lucide React

## License

MIT

# FFmpeg Template Composer

A visual tool to create FFmpeg video composition commands. Design your video layout by dragging and resizing video placeholders, then generate the corresponding FFmpeg command.

![FFmpeg Template Composer](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8)

## Features

- 🎨 **Visual Canvas** - Drag and drop video and text layers on an interactive canvas
- 🎬 **Video Layers** - Position and resize video placeholders with 8-point handles
- 📝 **Text Layers** - Add text with customizable fonts, sizes, colors, bold, and italic
- 📐 **Resize Handles** - 8-point resize handles for precise video control
- 🔒 **Aspect Ratio Lock** - Lock/unlock aspect ratio per video layer
- 📋 **Duplicate Layers** - Quickly duplicate existing video or text configurations
- 👁️ **Visibility Toggle** - Show/hide layers without deleting them
- 📊 **Z-Index Control** - Move layers up/down in the stack
- 🔲 **Grid & Snap** - Optional grid overlay with snap-to-grid functionality
- 🖼️ **Template Overlay** - Upload a PNG template with adjustable opacity
- 🎨 **Font Customization** - Choose from 10+ fonts with size, color, bold, and italic options
- 👀 **Real-time Preview** - See exactly how your composition will look
- 📝 **FFmpeg Generation** - Auto-generate FFmpeg filter_complex commands with drawtext
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

1. **Upload Template (Optional)**: Click "Upload PNG" to load a template image that will overlay on top of your composition
2. **Add Layers**: 
   - Click "Video" to create video placeholders
   - Click "Text" to add text layers
3. **Position & Configure**: 
   - Drag layers to position them
   - **Videos**: Use the yellow corner/edge handles to resize, lock aspect ratio with the "Aspect" button
   - **Text**: Choose font, size, color, and apply bold/italic styles
4. **Fine-tune**: Adjust position and properties via input fields for precise values
5. **Layer Management**: 
   - Show/hide layers with the eye icon
   - Duplicate layers with the copy icon
   - Reorder layers with up/down arrows
6. **Generate Command**: Click "Generate FFmpeg Command" to create the shell command
7. **Export**: Copy the command or save it as a .sh file

## Generated FFmpeg Command

The tool generates a complete FFmpeg command with:
- Multiple video inputs
- Proper scaling with aspect ratio preservation
- Overlay positioning
- Text rendering with drawtext filter
- PNG template compositing
- H.264 output encoding

Example output with video and text:
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
    [videos]drawtext=text='Sample Text':fontfile='/System/Library/Fonts/Arial.ttf':fontsize=48:fontcolor=0xffffff:x=50:y=1200[txt0];
    [txt0][2:v]overlay=0:0[output]
  " \
  -map "[output]" \
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

# 🎨 Infinite Canvas Whiteboard

<p align="center">
  <img src="public/favicon.svg" alt="Infinite Whiteboard Logo" width="80" height="80" />
</p>

<p align="center">
  A high-performance, fluid, and intuitive digital infinite canvas whiteboard inspired by <b>Microsoft Whiteboard</b>.<br/>
  Built with <b>React 19</b>, <b>TypeScript</b>, <b>HTML5 Canvas</b>, and <b>Vite</b>.
</p>

<p align="center">
  <a href="https://github.com/QuyNT3112/infinite-whiteboard/actions"><img src="https://img.shields.io/badge/CI-Passing-brightgreen?style=flat-square&logo=github-actions" alt="CI Status" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react" alt="React 19" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript" alt="TypeScript" /></a>
  <a href="https://vitejs.dev"><img src="https://img.shields.io/badge/Vite-8.x-646cff?style=flat-square&logo=vite" alt="Vite" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" /></a>
</p>

---

## 🌟 Key Features / Tính năng nổi bật

### 🖌️ Drawing & Styling
- **Infinite Canvas & Smooth Navigation**: Unlimited panning (Right-click or Hand tool) and cursor-anchored zoom (scroll wheel).
- **Smooth Spline Pen & Highlighter**: Anti-aliased midpoint quadratic Bézier splines with pressure sensitivity and round joins/caps.
- **🛡️ Stroke-Only Safe Eraser**: Intelligently erases and splits freehand ink strokes while **100% protecting images, sticky notes, shapes, and text boxes**.
- **13 Vector Shapes & Connectors**: Rectangles, rounded boxes, circles, ellipses, triangles, diamonds, stars, pentagons, hexagons, cylinders, arrows, and dashed lines. Hold `Shift` to constrain proportions.

### 📝 Content & Media
- **Rich Text & Sticky Notes**: Realistic shadow and 3D paper fold effect. Double-click to inline edit text.
- **Image Integration**: Upload files, drag-and-drop into canvas, or paste images directly from clipboard (`Ctrl + V`). Aspect ratio auto-preserved.
- **Multi-Selection & Batch Actions (`Ctrl + A`)**: Select all elements or box-select multiple items, batch move, batch duplicate (`Ctrl + D`), or delete (`Delete`/`Backspace`).

### 🎨 Themes & Customization
- **8 Canvas Background Themes**: Classic White, Warm Paper, Soft Gray, Ice Blue, Mint Green, Pastel Pink, Dark Slate, and Blackboard, plus an arbitrary Color Picker.
- **Adaptive Contrast Grid**: Dots and grid lines automatically adapt their contrast depending on background lightness.
- **High-Res Export & Persistence**: Export crisp PNG with chosen background color, Save/Load JSON board files, and auto-save state to `localStorage`.

---

## 🚀 Quick Start / Hướng dẫn cài đặt & khởi chạy

### Option 1: 1-Click Desktop Launcher (Khuyên dùng trên Windows)
1. Double-click file **`Whiteboard.exe`** trong thư mục dự án.
2. Ứng dụng sẽ tự động kích hoạt backend và mở giao diện tại `http://localhost:5173/`.
3. Bấm **"Stop & Exit"** khi muốn dừng phiên làm việc.

---

### Option 2: Run via Batch Script
Nhấp đúp chuột vào file **`run-whiteboard.bat`** để khởi chạy tự động.

---

### Option 3: Terminal / Command Line

```bash
# 1. Clone repository
git clone https://github.com/QuyNT3112/infinite-whiteboard.git
cd infinite-whiteboard

# 2. Cài đặt thư viện dependencies
npm install

# 3. Chạy môi trường phát triển (Development)
npm run dev

# 4. Mở trình duyệt web tại: http://localhost:5173/
```

Để đóng gói bản Production:
```bash
npm run build
node server.cjs
```

---

## ⌨️ Shortcuts & Controls / Bảng phím tắt & thao tác chuột

| Shortcut / Phím tắt | Action / Chức năng |
|---|---|
| **Right Click + Drag** | Di chuyển góc nhìn không gian vô hạn (Pan workspace) |
| **Mouse Wheel** | Phóng to / Thu nhỏ neo theo con trỏ chuột (Anchor Zoom) |
| **Left Click + Drag** | Vẽ nét, tẩy, tạo hình, kéo chọn đối tượng |
| **Double Click** | Chỉnh sửa nội dung chữ hoặc giấy ghi chú (Edit Text/Note) |
| **Shift + Drag Shape** | Khóa tỷ lệ tạo hình vuông / hình tròn đều hoàn hảo |
| **Ctrl + A** | **Chọn toàn bộ đối tượng trên bảng vẽ (Select All)** |
| **Ctrl + Z** | Hoàn tác (Undo - lên tới 60 bước) |
| **Ctrl + Y** / **Ctrl + Shift + Z** | Làm lại (Redo) |
| **Ctrl + D** | Nhân bản các đối tượng đang chọn (Duplicate) |
| **Ctrl + V** | Dán ảnh trực tiếp từ bộ nhớ tạm (Paste Image from Clipboard) |
| **Delete** / **Backspace** | Xóa các đối tượng đang chọn |
| **Escape** | Bỏ chọn hoặc hủy thao tác hiện tại |
| **V** | Công cụ chọn đối tượng (Select Tool) |
| **H** | Công cụ bàn tay kéo bảng (Hand / Pan Tool) |
| **P** | Bút vẽ tự do nét mượt (Pen Tool) |
| **Shift + P** | Bút dạ quang nhớ dòng (Highlighter Tool) |
| **E** | Cục tẩy an toàn (Safe Eraser) |
| **S** | Menu hình học (Shapes) |
| **L** | Đường thẳng & mũi tên (Lines & Arrows) |
| **T** | Chèn hộp văn bản (Text Box) |
| **N** | Chèn giấy ghi chú (Sticky Note) |

---

## 🧪 Automated Testing & Code Quality

Dự án bao gồm hệ thống kiểm thử tự động toàn diện với **Vitest** và công cụ kiểm tra mã nguồn **Oxlint**:

```bash
# Chạy bộ kiểm thử tự động
npm run test

# Kiểm tra chất lượng mã nguồn
npm run lint
```

Kết quả:
```text
 ✓ src/tests/whiteboard.test.ts (19 tests)
   ✓ A. Coordinate Transformation & Camera Model Tests (6)
   ✓ B. CRITICAL ACCEPTANCE: Stroke-Only Eraser & Non-Stroke Protection (7)
   ✓ C. Selection, Hit Testing, & Geometry Tests (3)
   ✓ D. Undo / Redo History Manager Tests (1)
   ✓ E. Persistence & JSON Serialization Tests (1)
   ✓ F. Select-All (Ctrl+A) & Canvas Theme Tests (1)

 Test Files: 1 passed (1) | Tests: 19 passed (19)
 Lint: 0 errors, 0 warnings
```

---

## 🏗️ Architecture & Project Structure

```text
infinite-whiteboard/
├── .github/workflows/
│   └── ci.yml               # Automated CI (lint, test, build)
├── public/                  # Static assets & icons
├── src/
│   ├── assets/              # Graphics and media
│   ├── components/          # React UI components
│   │   ├── Canvas.tsx       # Main HTML5 Canvas engine & event pipeline
│   │   ├── ContextBar.tsx   # Dynamic contextual tool styling bar
│   │   ├── Header.tsx       # Action buttons (export, import, clear, help)
│   │   ├── Toolbar.tsx      # Floating bottom dock
│   │   ├── ViewControls.tsx # Zoom & Canvas Background Theme selector
│   │   └── ...
│   ├── core/                # Pure business logic & algorithms
│   │   ├── camera.ts        # Infinite viewport transformation
│   │   ├── eraser.ts        # Stroke-splitting eraser algorithm
│   │   ├── geometry.ts      # Math, bounding boxes & shape rendering
│   │   ├── history.ts       # 60-level undo/redo manager
│   │   ├── hitTest.ts       # Point-in-polygon & distance tests
│   │   └── storage.ts       # Persistence & export helpers
│   ├── tests/               # Vitest automated test suites
│   ├── types/               # TypeScript interfaces & types
│   ├── App.tsx              # Application orchestrator
│   └── main.tsx             # React mount entry
├── WhiteboardLauncher.cs    # C# native launcher source code
├── Whiteboard.exe           # Standalone native launcher executable
├── server.cjs               # Lightweight local production server
├── run-whiteboard.bat       # Windows batch startup script
└── package.json
```

---

## 📄 License

Distributed under the [MIT License](./LICENSE). Copyright © 2026 QuyNT3112.

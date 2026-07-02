# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MIDI 小人物视频生成器 — 将 MIDI 文件转换为动画视频，每个 MIDI 轨道表现为一个"小人物"角色，角色会根据音符开合嘴巴、根据音高拉伸身体、歌词以"喵"的形式漂浮上升。最终输出 ProRes .mov 视频。

## Commands

```bash
# 启动开发服务器（端口 8787）
npm start

# 打包为 Windows 可执行文件
npm run build

# 构建 Swift 原生渲染器（仅 macOS）
swift build -c release
```

## Architecture

**Client-Server 架构，三条渲染路径：**

### Frontend (`app.js` + `index.html`)

- 单页 Web 应用，左侧 Canvas 预览（3840x2160），右侧配置栏
- 内置 MIDI 二进制解析器（`parseMidi()`，~170 行），无外部依赖
- 状态持久化：IndexedDB（二进制数据）+ localStorage（标量设置）
- Canvas 渲染每帧绘制背景、角色、歌词
- Web Audio API 提供音频预览（正弦波振荡器）

### Backend (`server.js`)

- 纯 `node:http` 服务器，无框架依赖
- 三条视频导出路由：
  1. **`POST /render-mov`** → 调用 Swift NativeRenderer（macOS 快速路径）
  2. **`POST /render-mov`（fallback）** → `@napi-rs/canvas` + ffmpeg 管道
  3. **`POST /export-start/frame/finish`** → 浏览器逐帧 PNG 上传 + ffmpeg 合成

### NativeRenderer (`Sources/NativeRenderer/main.swift`)

- macOS 命令行工具，CoreImage + Metal GPU 加速
- AVAssetWriter 写入 ProRes .mov
- 与 `app.js` 保持完全相同的绘制逻辑和常量

## Key Sync Points

`app.js` 和 `main.swift` 中的以下常量和算法必须保持同步：
- `CHARACTER_SIZE_RATIO = 0.3`
- `attack = 0.05s`, `release = 0.18s`
- `seededTilt()`、`smoothstep()`、`characterDynamics()` 算法
- 角色位置、音高拉伸、嘴巴开合、歌词漂浮的绘制逻辑

修改任一端的渲染逻辑时，必须同步更新另一端。

## Important Notes

- MIDI 解析器是手写的，不使用外部 MIDI 库
- 歌词文本在解析时被硬编码替换为"喵"
- 角色图片支持用户上传或使用内置占位形状
- ffmpeg 是服务端渲染的必需依赖
- `build.bat` 用于创建 Windows 分发包

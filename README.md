# MIDI 小人物视频生成器 - 增强版

## 📢 声明
本项目基于开源项目 [ren-shi-mao-video-maker](https://github.com/Lucas-on-the-code/ren-shi-mao-video-maker.git) 进行二次开发。感谢原作者 B站：【张卡斯的个人空间-哔哩哔哩】 https://b23.tv/TNTZm0D 的精彩工作！

## ✨ 新增功能（相比原版）
* 新增了 README 文档，方便快速了解和上手项目
* 优化了项目结构说明，降低新手入门门槛

## 🚀 快速开始

### 1. 下载
```bash
git clone https://github.com/miqi660/ren-shi-mao-video-maker.git
```
或前往 [Releases 页面](https://github.com/miqi660/ren-shi-mao-video-maker/releases) 下载打包好的 Windows 可执行文件。

### 2. 环境要求
- **Node.js** >= 18（源码运行需要）
- **ffmpeg**（视频导出必需，需加入系统 PATH）

### 3. 运行
```bash
# 进入项目目录
cd ren-shi-mao-video-maker

# 安装依赖
npm install

# 启动服务
npm start
```
打开浏览器访问 `http://localhost:8787`，上传 MIDI 文件即可开始使用。

### 打包为可执行文件（可选）
```bash
npm run build
```
构建产物将输出到 `dist/` 目录。

## 🤝 参与贡献
如果你觉得这个修改有帮助，欢迎给原项目 [ren-shi-mao-video-maker](https://github.com/Lucas-on-the-code/ren-shi-mao-video-maker.git) 和本项目点个 Star ⭐！

## 📄 许可证
本项目基于 [MIT 许可证](LICENSE) 开源。

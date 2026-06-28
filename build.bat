@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo   MIDI Character Video Maker - 打包脚本
echo ========================================
echo.

:: 设置目录
set "ROOT=%~dp0"
set "DIST=%ROOT%dist"
set "APP_DIR=%DIST%\midi-video-maker"

:: 清理旧的构建
if exist "%DIST%" (
    echo [1/5] 清理旧的构建文件...
    rmdir /s /q "%DIST%"
)

:: 创建目录结构
echo [2/5] 创建目录结构...
mkdir "%APP_DIR%"
mkdir "%APP_DIR%\fonts"
mkdir "%APP_DIR%\exports"

:: 复制文件
echo [3/5] 复制项目文件...
copy "%ROOT%server.js" "%APP_DIR%\" >nul
copy "%ROOT%package.json" "%APP_DIR%\" >nul
copy "%ROOT%index.html" "%APP_DIR%\" >nul
copy "%ROOT%app.js" "%APP_DIR%\" >nul
copy "%ROOT%styles.css" "%APP_DIR%\" >nul
copy "%ROOT%fonts.css" "%APP_DIR%\" >nul
xcopy "%ROOT%fonts\*" "%APP_DIR%\fonts\" /e /i /y >nul

:: 创建启动脚本
echo [4/5] 创建启动脚本...
(
echo @echo off
echo chcp 65001 ^>nul
echo title MIDI Character Video Maker
echo echo.
echo echo ========================================
echo echo   MIDI Character Video Maker
echo echo ========================================
echo echo.
echo echo 正在启动服务器...
echo echo 启动后请访问: http://localhost:8787
echo echo 按 Ctrl+C 停止服务器
echo echo.
echo cd /d "%%~dp0"
echo node server.js
echo pause
) > "%APP_DIR%\启动.bat"

:: 创建说明文件
echo [5/5] 创建说明文件...
(
echo MIDI Character Video Maker
echo ========================
echo.
echo 使用说明：
echo.
echo 1. 确保已安装 Node.js（建议 v18 或更高版本）
echo 2. 双击"启动.bat"启动服务器
echo 3. 在浏览器中访问 http://localhost:8787
echo 4. 选择 MIDI 文件开始制作视频
echo.
echo 依赖说明：
echo - Node.js: https://nodejs.org/
echo - ffmpeg（可选）: 用于视频导出
echo.
echo 如需安装依赖：
echo   npm install
echo.
echo 如需导出 MOV 视频：
echo - 方式一：使用浏览器端导出（较慢，但无需额外配置）
echo - 方式二：安装 ffmpeg 并配置环境变量
echo - 方式三：在 macOS 上构建 NativeRenderer（需要 Xcode）
) > "%APP_DIR%\README.txt"

echo.
echo ========================================
echo   打包完成！
echo ========================================
echo.
echo 输出目录: %APP_DIR%
echo.
echo 使用方法：
echo   1. 将 %APP_DIR% 文件夹复制到目标电脑
echo   2. 确保目标电脑已安装 Node.js
echo   3. 双击"启动.bat"运行
echo.
pause

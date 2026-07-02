@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   MIDI Character Video Maker - Portable Build
echo ========================================
echo.

set "ROOT=%~dp0"
set "DIST=%ROOT%dist-portable"
set "APP_DIR=%DIST%\midi-video-maker"
set "NODE_DIR=%APP_DIR%\node"
set "NODE_EXE=E:\nodejs\node.exe"
set "FFMPEG_DIR=C:\Users\Administrator\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin"

:: Check Node.js
if not exist "%NODE_EXE%" (
    echo ERROR: Node.js not found at %NODE_EXE%
    echo Please install Node.js or update the path in this script.
    pause
    exit /b 1
)

:: Clean
if exist "%DIST%" (
    echo [1/8] Cleaning old build...
    rmdir /s /q "%DIST%"
)

echo [2/8] Creating directories...
mkdir "%APP_DIR%"
mkdir "%APP_DIR%\fonts"
mkdir "%NODE_DIR%"
mkdir "%APP_DIR%\node_modules"

echo [3/8] Copying portable Node.js runtime...
copy "%NODE_EXE%" "%NODE_DIR%\node.exe" >nul
echo     node.exe copied.

echo [4/8] Copying ffmpeg...
if exist "%FFMPEG_DIR%\ffmpeg.exe" (
    copy "%FFMPEG_DIR%\ffmpeg.exe" "%NODE_DIR%\ffmpeg.exe" >nul
    copy "%FFMPEG_DIR%\ffprobe.exe" "%NODE_DIR%\ffprobe.exe" >nul
    echo     ffmpeg.exe + ffprobe.exe copied.
) else (
    echo     WARNING: ffmpeg not found at %FFMPEG_DIR%
    echo     Video export will not work without ffmpeg.
)

echo [5/8] Copying application files...
copy "%ROOT%server.js" "%APP_DIR%\" >nul
copy "%ROOT%package.json" "%APP_DIR%\" >nul
copy "%ROOT%index.html" "%APP_DIR%\" >nul
copy "%ROOT%app.js" "%APP_DIR%\" >nul
copy "%ROOT%styles.css" "%APP_DIR%\" >nul
copy "%ROOT%fonts.css" "%APP_DIR%\" >nul
xcopy "%ROOT%fonts\*" "%APP_DIR%\fonts\" /e /i /y >nul
echo     Application files copied.

echo [6/8] Copying node_modules (this may take a moment)...
xcopy "%ROOT%node_modules\@napi-rs" "%APP_DIR%\node_modules\@napi-rs\" /e /i /y >nul
for /r "%ROOT%node_modules" %%f in (*.node) do (
    set "rel=%%f"
    set "rel=!rel:%ROOT%node_modules=!"
    set "target=%APP_DIR%\node_modules!rel!"
    set "targetdir=!target!\.."
    if not exist "!targetdir!" mkdir "!targetdir!"
    copy "%%f" "!target!" >nul 2>nul
)
echo     Dependencies copied.

echo [7/8] Creating start script...
(
echo @echo off
echo title MIDI Character Video Maker
echo cd /d "%%~dp0"
echo set "PATH=%%~dp0node;%%PATH%%"
echo set "FFMPEG=%%~dp0node\ffmpeg.exe"
echo echo ========================================
echo echo   MIDI Character Video Maker
echo echo ========================================
echo echo.
echo echo Starting server...
echo echo Open http://localhost:8787 in your browser
echo echo Press Ctrl+C to stop
echo echo.
echo node\node.exe server.js
echo pause
) > "%APP_DIR%\start.bat"

echo [8/8] Creating README...
(
echo MIDI Character Video Maker - Portable
echo =======================================
echo.
echo Usage:
echo   1. Double-click "start.bat"
echo   2. Open http://localhost:8787 in your browser
echo   3. Select a MIDI file to start
echo.
echo No installation required. Node.js and ffmpeg are bundled.
echo.
echo To stop: Press Ctrl+C in the terminal window.
) > "%APP_DIR%\README.txt"

echo.
echo ========================================
echo   Build complete!
echo ========================================
echo.
echo Output: %APP_DIR%
echo.
echo Usage:
echo   1. Copy the entire folder to target machine
echo   2. Double-click "start.bat"
echo   3. Open http://localhost:8787
echo.
echo No installation required!
echo.
pause

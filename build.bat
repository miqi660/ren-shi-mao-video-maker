@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   MIDI Character Video Maker - Build
echo ========================================
echo.

set "ROOT=%~dp0"
set "DIST=%ROOT%dist"
set "APP_DIR=%DIST%\midi-video-maker"

if exist "%DIST%" (
    echo [1/5] Cleaning old build...
    rmdir /s /q "%DIST%"
)

echo [2/5] Creating directories...
mkdir "%APP_DIR%"
mkdir "%APP_DIR%\fonts"

echo [3/5] Copying files...
copy "%ROOT%server.js" "%APP_DIR%\" >nul
copy "%ROOT%package.json" "%APP_DIR%\" >nul
copy "%ROOT%index.html" "%APP_DIR%\" >nul
copy "%ROOT%app.js" "%APP_DIR%\" >nul
copy "%ROOT%styles.css" "%APP_DIR%\" >nul
copy "%ROOT%fonts.css" "%APP_DIR%\" >nul
xcopy "%ROOT%fonts\*" "%APP_DIR%\fonts\" /e /i /y >nul

echo [4/5] Creating start script...
(
echo @echo off
echo title MIDI Character Video Maker
echo echo.
echo echo ========================================
echo echo   MIDI Character Video Maker
echo echo ========================================
echo echo.
echo cd /d "%%~dp0"
echo if not exist "node_modules\@napi-rs\canvas" ^(
echo     echo First run - installing dependencies...
echo     call npm install --registry=https://registry.npmmirror.com
echo     if errorlevel 1 ^(
echo         echo.
echo         echo Failed to install dependencies. Please check your network.
echo         pause
echo         exit /b 1
echo     ^)
echo     echo Done.
echo     echo.
echo ^)
echo echo Starting server...
echo echo Open http://localhost:8787 in your browser
echo echo Press Ctrl+C to stop
echo echo.
echo node server.js
echo pause
) > "%APP_DIR%\start.bat"

echo [5/5] Creating README...
(
echo MIDI Character Video Maker
echo ========================
echo.
echo Usage:
echo.
echo 1. Make sure Node.js is installed (v18+ recommended)
echo 2. Double-click "start.bat" to launch the server
echo 3. Open http://localhost:8787 in your browser
echo 4. Select a MIDI file to start making videos
echo.
echo Dependencies:
echo - Node.js: https://nodejs.org/
echo - ffmpeg (optional): for video export
echo.
echo To install dependencies manually:
echo   npm install
echo.
echo To stop the server:
echo   Press Ctrl+C in the terminal
) > "%APP_DIR%\README.txt"

echo.
echo ========================================
echo   Build complete!
echo ========================================
echo.
echo Output: %APP_DIR%
echo.
echo Usage:
echo   1. Copy the folder to target machine
echo   2. Make sure Node.js is installed
echo   3. Double-click "start.bat" to run
echo.
pause

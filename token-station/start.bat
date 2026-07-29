@echo off
echo ========================================
echo   TokenStation - ????
echo ========================================
echo.

set "NODE_PATH=C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "SCRIPT=%~dp0server.js"

if not exist "%NODE_PATH%" (
    echo [??] ??? Node.js
    echo ??? https://nodejs.org ??
    pause
    exit /b 1
)

echo [??] ???...
echo [??] ????: http://localhost:3456
echo [??] ????: http://localhost:3456/admin
echo [??] ???: admin / admin123
echo [??] ??: demo / demo123
echo.
"%NODE_PATH%" "%SCRIPT%"
pause

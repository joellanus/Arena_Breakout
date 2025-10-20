@echo off
REM Arena Breakout Helper Launcher
REM This script launches the helper in Chrome app mode (borderless window)

SET HELPER_PATH=%~dp0index.html

REM Try Chrome first
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="file:///%HELPER_PATH%"
    exit
)

REM Try Chrome (x86)
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --app="file:///%HELPER_PATH%"
    exit
)

REM Try Edge
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="file:///%HELPER_PATH%"
    exit
)

REM Fallback to default browser
echo Chrome or Edge not found, opening in default browser...
start "" "%HELPER_PATH%"


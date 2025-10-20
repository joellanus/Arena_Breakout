@echo off
REM Interactive Map Tool Launcher
REM Opens the map tool directly in app mode

SET MAP_TOOL_PATH=%~dp0map-tool.html

REM Try Chrome first
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="file:///%MAP_TOOL_PATH%"
    exit
)

REM Try Chrome (x86)
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --app="file:///%MAP_TOOL_PATH%"
    exit
)

REM Try Edge
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="file:///%MAP_TOOL_PATH%"
    exit
)

REM Fallback to default browser
echo Chrome or Edge not found, opening in default browser...
start "" "%MAP_TOOL_PATH%"


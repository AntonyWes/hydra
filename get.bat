@echo off
setlocal
for /f "tokens=*" %%i in ('powershell -command "Get-WmiObject Win32_Processor | Select-Object -ExpandProperty Name"') do (
    set CPU=%%i
)
for /f "tokens=*" %%i in ('powershell -command "Get-WmiObject Win32_VideoController | Select-Object -ExpandProperty Name | Select-Object -First 1"') do (
    set GPU=%%i
)
for /f "tokens=*" %%i in ('powershell -command "Get-WmiObject Win32_ComputerSystem | Select-Object -ExpandProperty TotalPhysicalMemory"') do (
    set Memory=%%i
)
echo %CPU%
echo %GPU%
echo %Memory%
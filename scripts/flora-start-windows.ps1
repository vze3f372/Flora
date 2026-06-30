$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$LogDir = Join-Path $Root "logs"
$StartupLog = Join-Path $LogDir "flora-startup-windows.log"
$ServerLog = Join-Path $LogDir "flora-server.log"
$HealthUrl = "http://127.0.0.1:8000/api/health"
$AdminUrl = "http://127.0.0.1:8000/admin.html"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-FloraLog {
    param([string]$Message)

    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $StartupLog -Value "[$Timestamp] $Message"
}

function Show-FloraPopup {
    param(
        [string]$Title,
        [string]$Message,
        [string]$Kind = "Info"
    )

    try {
        Add-Type -AssemblyName PresentationFramework

        $Icon = [System.Windows.MessageBoxImage]::Information

        if ($Kind -eq "Error") {
            $Icon = [System.Windows.MessageBoxImage]::Error
        }

        [System.Windows.MessageBox]::Show(
            $Message,
            $Title,
            [System.Windows.MessageBoxButton]::OK,
            $Icon
        ) | Out-Null
    }
    catch {
        $Shell = New-Object -ComObject WScript.Shell
        $Shell.Popup($Message, 0, $Title, 0) | Out-Null
    }
}

function Get-FloraPython {
    if (Get-Command py -ErrorAction SilentlyContinue) {
        return @{
            Command = "py"
            Prefix = @("-3")
        }
    }

    if (Get-Command python -ErrorAction SilentlyContinue) {
        return @{
            Command = "python"
            Prefix = @()
        }
    }

    return $null
}

try {
    Set-Location $Root

    Write-FloraLog "========================================"
    Write-FloraLog "Starting Flora from Windows launcher."
    Write-FloraLog "Root: $Root"

    $Python = Get-FloraPython

    if ($null -eq $Python) {
        $Message = "Python was not found. Install Python 3, then try starting Flora again. Startup log: $StartupLog"
        Write-FloraLog $Message
        Show-FloraPopup "Flora startup failed" $Message "Error"
        exit 1
    }

    $PythonCommand = $Python.Command
    $PythonPrefix = $Python.Prefix

    Write-FloraLog "Using Python command: $PythonCommand $($PythonPrefix -join ' ')"

    $VersionOutput = & $PythonCommand @PythonPrefix "--version" 2>&1
    Write-FloraLog "Python version: $VersionOutput"

    Write-FloraLog "Running scripts/flora-launcher.py"

    $LauncherOutput = & $PythonCommand @PythonPrefix "scripts\flora-launcher.py" 2>&1
    $LauncherExit = $LASTEXITCODE
    $LauncherText = $LauncherOutput -join [Environment]::NewLine

    Write-FloraLog "Launcher exit code: $LauncherExit"
    Write-FloraLog "Launcher output:"
    Write-FloraLog $LauncherText

    $LauncherJson = $null

    try {
        $LauncherJson = $LauncherText | ConvertFrom-Json
    }
    catch {
        Write-FloraLog "Launcher output was not valid JSON."
    }

    if ($LauncherExit -ne 0) {
        $Message = "Flora launcher exited with code $LauncherExit. Startup log: $StartupLog Server log: $ServerLog"
        Show-FloraPopup "Flora startup failed" $Message "Error"
        exit $LauncherExit
    }

    if ($null -ne $LauncherJson -and $LauncherJson.ok -eq $false) {
        $Message = "Flora did not start correctly. Action: $($LauncherJson.action). Startup log: $StartupLog Server log: $ServerLog"
        Show-FloraPopup "Flora startup failed" $Message "Error"
        exit 1
    }

    Start-Sleep -Seconds 1

    Write-FloraLog "Checking health endpoint: $HealthUrl"

    try {
        $Health = Invoke-RestMethod -Uri $HealthUrl -TimeoutSec 4

        if ($Health.ok -ne $true) {
            throw "Health endpoint returned an unexpected response."
        }
    }
    catch {
        $RecentServerLog = ""

        if (Test-Path $ServerLog) {
            $RecentServerLog = (Get-Content $ServerLog -Tail 20) -join [Environment]::NewLine
        }

        Write-FloraLog "Health check failed."
        Write-FloraLog "$_"
        Write-FloraLog "Recent server log:"
        Write-FloraLog $RecentServerLog

        $Message = "Flora started, but the health check failed. Startup log: $StartupLog Server log: $ServerLog"
        Show-FloraPopup "Flora health check failed" $Message "Error"
        exit 1
    }

    Write-FloraLog "Flora is running."

    Start-Process $AdminUrl

    # Success is logged silently. Error conditions still show popups.

    exit 0
}
catch {
    Write-FloraLog "Unexpected startup error:"
    Write-FloraLog "$_"

    $Message = "Unexpected Flora startup error. Startup log: $StartupLog Server log: $ServerLog"
    Show-FloraPopup "Flora startup failed" $Message "Error"

    exit 1
}

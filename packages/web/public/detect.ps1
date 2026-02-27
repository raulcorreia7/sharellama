# Supports: Multiple CPUs, Multiple GPUs

Write-Host "=== LocalLlama Hardware Detection ===" -ForegroundColor Cyan
Write-Host ""

# CPU(s) - handles multiple sockets
$cpus = Get-CimInstance Win32_Processor
$cpuCount = @($cpus).Count
foreach ($cpu in $cpus) {
  if ($cpuCount -gt 1) {
    Write-Host "CPU (Socket $($cpu.SocketDesignation)): $($cpu.Name) ($($cpu.NumberOfCores) cores, $($cpu.NumberOfLogicalProcessors) threads)"
  } else {
    Write-Host "CPU: $($cpu.Name) ($($cpu.NumberOfCores) cores, $($cpu.NumberOfLogicalProcessors) threads)"
  }
}

# RAM
$ram = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
Write-Host "RAM: $ram GB"

# OS
$os = Get-CimInstance Win32_OperatingSystem
Write-Host "OS: $($os.Caption) Build $($os.BuildNumber)"

# GPU(s) - handles multiple GPUs
Write-Host ""
Write-Host "GPU(s):"
$gpus = Get-CimInstance Win32_VideoController
foreach ($gpu in $gpus) {
  $vram = [math]::Round($gpu.AdapterRAM / 1GB)
  Write-Host "  - $($gpu.Name) ($vram GB)"
}

Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host "Copy the above to your submission!" -ForegroundColor Green

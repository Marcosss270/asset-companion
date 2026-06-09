# A3 Agent v1 - Windows monitoring agent for Asset Companion
# Install:  iwr -useb https://<your-url>/agent/a3-agent.ps1 | iex; Install-A3Agent -Url '<url>' -Token '<token>'

function Install-A3Agent {
  param(
    [Parameter(Mandatory=$true)][string]$Url,
    [Parameter(Mandatory=$true)][string]$Token
  )
  $dir = "$env:ProgramData\A3Agent"
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  @{ Url=$Url; Token=$Token } | ConvertTo-Json | Set-Content "$dir\config.json"
  $script = "$dir\agent.ps1"
  (Invoke-WebRequest -UseBasicParsing "$Url/agent/a3-agent.ps1").Content | Set-Content $script
  $action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`" -RunOnce"
  $trigger = New-ScheduledTaskTrigger -AtStartup
  $trigger2 = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
  Register-ScheduledTask -TaskName "A3Agent" -Action $action -Trigger @($trigger,$trigger2) -RunLevel Highest -Force | Out-Null
  Write-Host "A3 Agent instalado. Tarefa: A3Agent" -ForegroundColor Green
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script -RunOnce
}

function Get-A3Inventory {
  $cs = Get-CimInstance Win32_ComputerSystem
  $os = Get-CimInstance Win32_OperatingSystem
  $cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name
  $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
  $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1).IPAddress
  $mac = (Get-NetAdapter | Where-Object Status -eq 'Up' | Select-Object -First 1).MacAddress
  return @{
    hostname       = $env:COMPUTERNAME
    usuario_atual  = $env:USERNAME
    ip             = $ip
    mac            = $mac
    so             = $os.Caption
    so_versao      = $os.Version
    cpu            = $cpu
    ram_mb         = [int]($cs.TotalPhysicalMemory / 1MB)
    disco_total_gb = [math]::Round($disk.Size / 1GB, 1)
    disco_livre_gb = [math]::Round($disk.FreeSpace / 1GB, 1)
  }
}

function Get-A3Discovery {
  $devs = @()
  $subnet = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1).IPAddress
  if (-not $subnet) { return $devs }
  $prefix = ($subnet -split '\.')[0..2] -join '.'
  1..30 | ForEach-Object -Parallel { Test-Connection -ComputerName "$using:prefix.$_" -Count 1 -Quiet -TimeoutSeconds 1 | Out-Null } -ThrottleLimit 30
  $arp = arp -a | Select-String "$prefix\."
  foreach ($line in $arp) {
    $parts = ($line -split '\s+') | Where-Object { $_ }
    if ($parts.Count -ge 2 -and $parts[0] -match '\d+\.\d+\.\d+\.\d+') {
      $devs += @{ ip = $parts[0]; mac = $parts[1]; tipo_sugerido = "unknown" }
    }
  }
  return $devs
}

function Send-A3Heartbeat {
  param([switch]$RunOnce)
  $cfg = Get-Content "$env:ProgramData\A3Agent\config.json" | ConvertFrom-Json
  $inv = Get-A3Inventory
  try {
    Invoke-RestMethod -Uri "$($cfg.Url)/api/public/agent/heartbeat" -Method POST -Headers @{ 'x-agent-token' = $cfg.Token; 'Content-Type'='application/json' } -Body (@{ inventario = $inv } | ConvertTo-Json) | Out-Null
  } catch { Write-Warning $_ }
  # Discovery a cada hora
  $marker = "$env:ProgramData\A3Agent\last-discovery.txt"
  $lastTime = if (Test-Path $marker) { [datetime](Get-Content $marker) } else { (Get-Date).AddHours(-2) }
  if (((Get-Date) - $lastTime).TotalMinutes -ge 60) {
    $devs = Get-A3Discovery
    if ($devs.Count -gt 0) {
      try {
        Invoke-RestMethod -Uri "$($cfg.Url)/api/public/agent/discovery" -Method POST -Headers @{ 'x-agent-token' = $cfg.Token; 'Content-Type'='application/json' } -Body (@{ dispositivos = $devs } | ConvertTo-Json -Depth 4) | Out-Null
        (Get-Date).ToString("o") | Set-Content $marker
      } catch { Write-Warning $_ }
    }
  }
}

if ($args -contains "-RunOnce") { Send-A3Heartbeat -RunOnce }

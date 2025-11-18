param(
    [int]$port = 3000
)

$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($connections) {
    foreach ($conn in $connections) {
        Write-Host "Killing process $($conn.OwningProcess) on port $port"
        Stop-Process -Id $conn.OwningProcess -Force
    }
    Write-Host "Process killed successfully on port $port"
} else {
    Write-Host "No process found on port $port"
}
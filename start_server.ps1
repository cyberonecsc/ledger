# ==========================================================================
# CYBERONE CSC Platform - Local Web Server (start_server.ps1)
# Bypasses local file CORS restrictions for ES Module loading.
# ==========================================================================

$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

# Auto-sync with GitHub remote on startup to get latest code updates
try {
    Write-Host "Syncing code with GitHub remote..." -ForegroundColor Cyan
    git fetch origin
    git reset --hard origin/main
    Write-Host "Successfully synced code with GitHub main branch!" -ForegroundColor Green
} catch {
    Write-Warning "Could not sync code with GitHub remote. Running in offline mode."
}

try {
    $listener.Start()
} catch {
    Write-Error "Failed to start server. Port $port may already be in use."
    Read-Host "Press Enter to exit"
    exit
}

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  CYBERONE CSC Local Server Running" -ForegroundColor Green
Write-Host "  URL: http://localhost:$port/" -ForegroundColor Yellow
Write-Host "  Press Ctrl+C in this window to stop server." -ForegroundColor Red
Write-Host "=============================================" -ForegroundColor Cyan

# Automatically launch browser
Start-Process "http://localhost:$port/"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $path = $request.Url.LocalPath
        if ($request.HttpMethod -eq "OPTIONS") {
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
            $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
            $response.StatusCode = 200
            $response.OutputStream.Close()
            continue
        }

        if ($request.HttpMethod -eq "POST" -and $path -eq "/api/save") {
            try {
                $reader = New-Object System.IO.StreamReader($request.InputStream)
                $body = $reader.ReadToEnd()
                $reader.Close()
                
                $dbPath = Join-Path $PSScriptRoot "db.json"
                [System.IO.File]::WriteAllText($dbPath, $body)
                
                # Run background Git push job and log results
                Start-Job -ScriptBlock {
                    param($repoPath)
                    cd $repoPath
                    $logFile = Join-Path $repoPath "git_sync.log"
                    Get-Date | Out-File $logFile -Append
                    
                    # Back up our latest merged database state
                    $tempDbPath = [System.IO.Path]::GetTempFileName()
                    Copy-Item "db.json" $tempDbPath -Force
                    
                    # Fetch origin and hard reset our local branch to match origin/main
                    # This cleanly clears any local commits or push conflicts
                    git fetch origin 2>&1 | Out-File $logFile -Append
                    git reset --hard origin/main 2>&1 | Out-File $logFile -Append
                    
                    # Overwrite db.json with our merged version
                    Copy-Item $tempDbPath "db.json" -Force
                    Remove-Item $tempDbPath -ErrorAction SilentlyContinue
                    
                    # Add, commit, and push
                    git add db.json 2>&1 | Out-File $logFile -Append
                    git commit -m "Auto-sync database update" 2>&1 | Out-File $logFile -Append
                    git push origin main 2>&1 | Out-File $logFile -Append
                } -ArgumentList $PSScriptRoot | Out-Null
                
                $response.ContentType = "application/json"
                $response.AddHeader("Access-Control-Allow-Origin", "*")
                $response.StatusCode = 200
                $resBytes = [System.Text.Encoding]::UTF8.GetBytes('{"status":"success"}')
                $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
            } catch {
                $response.StatusCode = 500
                $resBytes = [System.Text.Encoding]::UTF8.GetBytes('{"status":"error","message":"' + $_.Exception.Message + '"}')
                $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
            }
            $response.OutputStream.Close()
            continue
        }

        if ($path -eq "/" -or [string]::IsNullOrEmpty($path)) { 
            $path = "/index.html" 
        }
        
        # Binds local file path
        $filePath = Join-Path $PSScriptRoot $path
        
        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            # Content-type mapping (crucial for JS modules CORS loading)
            if ($filePath.EndsWith(".html")) { 
                $response.ContentType = "text/html; charset=utf-8" 
            } elseif ($filePath.EndsWith(".css")) { 
                $response.ContentType = "text/css" 
            } elseif ($filePath.EndsWith(".js")) { 
                $response.ContentType = "application/javascript" 
            } elseif ($filePath.EndsWith(".png")) { 
                $response.ContentType = "image/png" 
            } elseif ($filePath.EndsWith(".jpg") -or $filePath.EndsWith(".jpeg")) { 
                $response.ContentType = "image/jpeg" 
            } elseif ($filePath.EndsWith(".ico")) { 
                $response.ContentType = "image/x-icon" 
            }
            
            # Allow local requests
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 File Not Found: $path")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.OutputStream.Close()
    } catch {
        # Catch connection resets or reloads quietly
    }
}
$listener.Close()

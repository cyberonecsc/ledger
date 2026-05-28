# ==========================================================================
# CYBERONE CSC Platform - Local Web Server (start_server.ps1)
# Bypasses local file CORS restrictions for ES Module loading.
# ==========================================================================

$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

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

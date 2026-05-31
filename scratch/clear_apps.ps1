$db = Get-Content -Raw -Path db.json | ConvertFrom-Json
$db.cyberone_v2_applications = "[]"
$db.cyberone_v2_last_modified = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$db | ConvertTo-Json -Compress | Set-Content -Path db.json
Write-Output "db.json applications cleared."

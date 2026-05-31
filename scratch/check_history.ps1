$commits = git log --oneline -n 30 -- db.json | ForEach-Object { $_.Split(' ')[0] }
Write-Host "Found $($commits.Count) commits to inspect..."

foreach ($commit in $commits) {
    $show = git show "$($commit):db.json" 2>$null
    if ($show) {
        try {
            $json = $show | ConvertFrom-Json
            if ($json.cyberone_v2_users) {
                $users = $json.cyberone_v2_users | ConvertFrom-Json
                $usernames = $users.username -join ', '
                Write-Host "Commit $commit ($($json.cyberone_v2_last_modified)) : $usernames"
            } else {
                Write-Host "Commit $commit : No cyberone_v2_users key"
            }
        } catch {
            Write-Host "Commit $commit : Error parsing JSON"
        }
    } else {
        Write-Host "Commit $commit : Git show failed"
    }
}

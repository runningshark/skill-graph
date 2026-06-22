$source = "C:\Users\19794\skill-graph\.git_head_index.html"
$output = "C:\Users\19794\skill-graph\app.js"
$content = [System.IO.File]::ReadAllText($source, [System.Text.UTF8Encoding]::new($false))

# Find the main script block - starts with <script> and contains ACCESS GATE
$start = $content.IndexOf('<script>')
$end = $content.IndexOf('</script>', $start + 10)

# Verify this is the main JS block
$block = $content.Substring($start, $end - $start + 9)
if (!$block.Contains('ACCESS GATE')) {
    Write-Host "ERROR: Main JS block not found!"
    exit 1
}

# Extract JS content (remove <script> and </script> tags)
$jsStart = $start + '<script>'.Length
$jsEnd = $end
$jsCode = $content.Substring($jsStart, $jsEnd - $jsStart)

# Write with proper UTF-8 (no BOM)
[System.IO.File]::WriteAllText($output, $jsCode, [System.Text.UTF8Encoding]::new($false))
Write-Host "Extracted JS: $($jsCode.Length) chars"

Add-Type -AssemblyName System.Drawing

$dir = Join-Path $PSScriptRoot '..\assets\images'
New-Item -ItemType Directory -Force -Path $dir | Out-Null

function New-WheelIcon($path, $size, $bgHex, [bool]$transparent, $wheelHex, [double]$scale) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    if ($transparent) {
        $g.Clear([System.Drawing.Color]::Transparent)
    } else {
        $g.Clear([System.Drawing.ColorTranslator]::FromHtml($bgHex))
    }

    $cx = $size / 2.0
    $cy = $size / 2.0
    $R = ($size * $scale) / 2.0   # outer rim radius

    $color = [System.Drawing.ColorTranslator]::FromHtml($wheelHex)
    $brush = New-Object System.Drawing.SolidBrush($color)

    # Outer rim (thick ring)
    $rimThick = $R * 0.20
    $rimPen = New-Object System.Drawing.Pen($color, [single]$rimThick)
    $g.DrawEllipse($rimPen, [single]($cx - $R), [single]($cy - $R), [single](2 * $R), [single](2 * $R))

    # Spokes (left, right, down) — classic 3-spoke wheel
    $spokePen = New-Object System.Drawing.Pen($color, [single]($R * 0.20))
    $spokePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $spokePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $reach = $R - $rimThick * 0.5
    $g.DrawLine($spokePen, [single]$cx, [single]$cy, [single]($cx - $reach), [single]$cy)          # left
    $g.DrawLine($spokePen, [single]$cx, [single]$cy, [single]($cx + $reach), [single]$cy)          # right
    $g.DrawLine($spokePen, [single]$cx, [single]$cy, [single]$cx, [single]($cy + $reach))          # down

    # Hub (center disc)
    $hub = $R * 0.30
    $g.FillEllipse($brush, [single]($cx - $hub), [single]($cy - $hub), [single](2 * $hub), [single](2 * $hub))

    $g.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "wrote $path"
}

# Launcher icon: brand-blue field, white steering wheel
New-WheelIcon (Join-Path $dir 'icon.png') 1024 '#0071BC' $false '#FFFFFF' 0.60
# Adaptive foreground: transparent, white wheel inside safe zone
New-WheelIcon (Join-Path $dir 'adaptive-foreground.png') 1024 '#000000' $true '#FFFFFF' 0.42
# Splash: transparent bg (splash color is brand blue), white wheel
New-WheelIcon (Join-Path $dir 'splash-icon.png') 512 '#000000' $true '#FFFFFF' 0.60
# Favicon
New-WheelIcon (Join-Path $dir 'favicon.png') 64 '#0071BC' $false '#FFFFFF' 0.62

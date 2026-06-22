param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

Add-Type -AssemblyName System.Drawing

$source = [System.Drawing.Bitmap]::FromFile((Resolve-Path $InputPath))
$output = New-Object System.Drawing.Bitmap($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

try {
  for ($y = 0; $y -lt $source.Height; $y++) {
    for ($x = 0; $x -lt $source.Width; $x++) {
      $color = $source.GetPixel($x, $y)
      $greenDistance = [Math]::Min($color.G - $color.R, $color.G - $color.B)

      if ($color.G -gt 145 -and $greenDistance -gt 72) {
        $alpha = [Math]::Max(0, [Math]::Min(255, [int](255 * (132 - $greenDistance) / 60)))
        if ($alpha -eq 0) {
          $output.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
          continue
        }

        $despilledGreen = [Math]::Min($color.G, [int]([Math]::Max($color.R, $color.B) * 1.12))
        $output.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $color.R, $despilledGreen, $color.B))
        continue
      }

      $output.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $color.R, $color.G, $color.B))
    }
  }

  $destination = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
  $output.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
}
finally {
  $source.Dispose()
  $output.Dispose()
}

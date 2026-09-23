<#
.SYNOPSIS
    Serves the site at http://localhost:8080/ for local preview. No dependencies.

.DESCRIPTION
    A small static file server on .NET's HttpListener, so the site can be
    previewed on Windows without installing Python or Node. It behaves like
    GitHub Pages where it matters: directory URLs serve index.html, extensionless
    URLs fall back to .html, dot-folders like .git are never served, and missing
    paths get 404.html with a 404 status. It listens on localhost only.

.PARAMETER Port
    Port to listen on. Defaults to 8080.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File tools\serve.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File tools\serve.ps1 -Port 9000
#>
[CmdletBinding()]
param(
    [ValidateRange(1024, 65535)]
    [int]$Port = 8080
)

$ErrorActionPreference = 'Stop'

$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')

$mimeTypes = @{
    '.html'  = 'text/html; charset=utf-8'
    '.css'   = 'text/css; charset=utf-8'
    '.js'    = 'text/javascript; charset=utf-8'
    '.json'  = 'application/json; charset=utf-8'
    '.xml'   = 'application/xml; charset=utf-8'
    '.txt'   = 'text/plain; charset=utf-8'
    '.svg'   = 'image/svg+xml'
    '.png'   = 'image/png'
    '.jpg'   = 'image/jpeg'
    '.jpeg'  = 'image/jpeg'
    '.webp'  = 'image/webp'
    '.ico'   = 'image/x-icon'
    '.woff2' = 'font/woff2'
}

# Map a URL path to a file under $root, the way GitHub Pages would.
# Returns $null when nothing should be served.
function Resolve-SitePath([string]$UrlPath) {
    $relative = [Uri]::UnescapeDataString($UrlPath).TrimStart('/')

    # Never serve dot-folders or dotfiles (.git, .github, .nojekyll).
    if ($relative -split '[\\/]' | Where-Object { $_.StartsWith('.') -and $_ -ne '.' -and $_ -ne '..' }) {
        return $null
    }

    $full = [System.IO.Path]::GetFullPath((Join-Path $root $relative))

    # Refuse anything that resolves outside the site root (e.g. /..%2f..%2f).
    if ($full -ne $root -and -not $full.StartsWith("$root\", [StringComparison]::OrdinalIgnoreCase)) {
        return $null
    }

    if (Test-Path -LiteralPath $full -PathType Container) {
        $full = Join-Path $full 'index.html'
    }
    elseif (-not (Test-Path -LiteralPath $full) -and (Test-Path -LiteralPath "$full.html" -PathType Leaf)) {
        $full = "$full.html"
    }

    if (Test-Path -LiteralPath $full -PathType Leaf) { return $full }
    return $null
}

function Send-File($Context, [string]$Path, [int]$Status) {
    $response = $Context.Response
    $extension = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
    $bytes = [System.IO.File]::ReadAllBytes($Path)

    $response.StatusCode = $Status
    $response.ContentType = if ($mimeTypes.ContainsKey($extension)) { $mimeTypes[$extension] } else { 'application/octet-stream' }
    $response.Headers['Cache-Control'] = 'no-store'
    $response.Headers['X-Content-Type-Options'] = 'nosniff'
    $response.ContentLength64 = $bytes.Length
    if ($Context.Request.HttpMethod -ne 'HEAD') {
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    $response.Close()
}

$prefix = "http://localhost:$Port/"
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
}
catch {
    Write-Error "Couldn't listen on $prefix. Is another program using port $Port? Try -Port 9000."
    exit 1
}

Write-Host "Serving $root"
Write-Host "Open $prefix  (Ctrl+C to stop)"

try {
    while ($listener.IsListening) {
        # Wait in short slices so Ctrl+C is handled promptly.
        $pending = $listener.GetContextAsync()
        while (-not $pending.Wait(250)) { }
        $context = $pending.Result

        try {
            $path = $context.Request.Url.AbsolutePath
            $file = Resolve-SitePath $path
            if ($file) {
                Send-File $context $file 200
                Write-Host "200 $path"
            }
            else {
                Send-File $context (Join-Path $root '404.html') 404
                Write-Host "404 $path" -ForegroundColor Yellow
            }
        }
        catch {
            # A dropped connection shouldn't take the server down.
            Write-Warning "Request failed: $($_.Exception.Message)"
            try { $context.Response.Abort() } catch { }
        }
    }
}
finally {
    $listener.Stop()
    $listener.Close()
}

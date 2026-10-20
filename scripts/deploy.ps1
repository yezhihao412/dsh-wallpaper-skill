# 把两张处理好的壁纸内嵌进 DSH 的 wallpaper 插件并部署到当前 profile。
#
# 用法：
#   powershell -NoProfile -ExecutionPolicy Bypass -File deploy.ps1 -Light embed-light.jpg -Dark embed-dark.jpg
#
# 默认值都可以不传：模板取本脚本上一级的 plugin\client.template.js，
# profile 取环境变量 DSH_PROFILE_DIR（DSH 里执行时一定有）。
param(
    [Parameter(Mandatory = $true)][string]$Light,
    [Parameter(Mandatory = $true)][string]$Dark,
    [string]$Template = '',
    [string]$Profile = $env:DSH_PROFILE_DIR,
    [string]$Node = ''
)

$ErrorActionPreference = 'Stop'

if (-not $Template) {
    # 仓库布局：<repo>/scripts/deploy.ps1 → <repo>/plugin/client.template.js
    $Template = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\plugin\client.template.js'))
}
if (-not $Profile) { throw '没有 DSH_PROFILE_DIR，请用 -Profile 显式指定 profile 目录' }
if (-not $Node) {
    $candidates = @(
        (Join-Path $env:DSH_HOME 'dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'),
        'C:\Program Files\nodejs\node.exe'
    )
    foreach ($c in $candidates) { if (Test-Path $c) { $Node = $c; break } }
    if (-not $Node) { $Node = 'node' }
}

foreach ($p in @($Light, $Dark, $Template)) {
    if (-not (Test-Path $p)) { throw "找不到文件: $p" }
}

$pkgDir = Split-Path $Template -Parent
$tpl = Get-Content $Template -Raw -Encoding UTF8
if ($tpl -notmatch '__LIGHT__' -or $tpl -notmatch '__DARK__') {
    throw "模板里没有 __LIGHT__ / __DARK__ 占位符：$Template"
}

$lightB64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($Light))
$darkB64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($Dark))
$out = $tpl.Replace('__LIGHT__', 'data:image/jpeg;base64,' + $lightB64).Replace('__DARK__', 'data:image/jpeg;base64,' + $darkB64)

$clientPath = Join-Path $pkgDir 'client.js'
[IO.File]::WriteAllText($clientPath, $out, (New-Object Text.UTF8Encoding($false)))
& $Node --check $clientPath
if ($LASTEXITCODE -ne 0) { throw '生成的 client.js 语法检查失败' }

$destDir = Join-Path $Profile 'node_modules\@local\dsh-wallpaper'
New-Item -ItemType Directory -Force -Path $destDir | Out-Null
foreach ($f in @('package.json', 'index.js', 'cordis.patch.yml', 'icon.svg')) {
    $src = Join-Path $pkgDir $f
    if (Test-Path $src) { Copy-Item $src (Join-Path $destDir $f) -Force }
}
$localeSrc = Join-Path $pkgDir 'locale'
if (Test-Path $localeSrc) {
    New-Item -ItemType Directory -Force -Path (Join-Path $destDir 'locale') | Out-Null
    Copy-Item (Join-Path $localeSrc '*.json') (Join-Path $destDir 'locale') -Force
}
Copy-Item $clientPath (Join-Path $destDir 'client.js') -Force

$patch = Join-Path $Profile 'cordis.patch.yml'
if (Test-Path $patch) {
    $patchText = Get-Content $patch -Raw -Encoding UTF8
    if ($patchText -notmatch 'dsh-wallpaper') {
        Copy-Item $patch ($patch + '.bak-' + (Get-Date).ToString('yyyyMMdd-HHmmss')) -Force
        Add-Content -Path $patch -Value "`r`n- insert:`r`n    - id: dsh-wallpaper`r`n      name: '@local/dsh-wallpaper'`r`n" -Encoding UTF8 -NoNewline
        Write-Host '已在 cordis.patch.yml 里补上注册项'
    }
} else {
    Write-Host "警告：$patch 不存在，跳过注册"
}

Write-Host ("已部署: {0:N0} KB -> {1}" -f ((Get-Item (Join-Path $destDir 'client.js')).Length / 1KB), $destDir)
Write-Host '需要重启 DSH 才会生效（先问用户）。'

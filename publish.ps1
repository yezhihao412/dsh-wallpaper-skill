# 通过 GitHub REST API 创建仓库并上传本目录下的文件（不需要 git）。
#
# 用法：
#   powershell -NoProfile -ExecutionPolicy Bypass -File publish.ps1 -TokenFile C:\Users\you\.gh-token [-RepoName dsh-wallpaper-skill]
#
# Token 需要 Contents: Read and write + Administration: Read and write（fine-grained），
# 或 classic 的 repo scope。脚本不会打印 token。

param(
    [Parameter(Mandatory = $true)][string]$TokenFile,
    [string]$RepoName = 'dsh-wallpaper-skill',
    [string]$Description = 'Turn any picture into the DeepSeek Harness interface wallpaper (skill + plugin)',
    [string]$SourceDir = '',
    [switch]$Private
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if (-not (Test-Path $TokenFile)) { throw "找不到 token 文件: $TokenFile" }
$token = (Get-Content $TokenFile -Raw).Trim()
if ($token.Length -lt 20) { throw 'token 看起来不对（太短）' }

if (-not $SourceDir) { $SourceDir = $PSScriptRoot }
$SourceDir = [IO.Path]::GetFullPath($SourceDir)

$headers = @{
    Authorization          = "Bearer $token"
    'User-Agent'           = 'dsh-wallpaper-publisher'
    Accept                 = 'application/vnd.github+json'
    'X-GitHub-Api-Version' = '2022-11-28'
}

function Invoke-GH {
    param([string]$Method, [string]$Uri, $Body)
    $params = @{ Method = $Method; Uri = $Uri; Headers = $headers }
    if ($null -ne $Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 8)
        $params.ContentType = 'application/json; charset=utf-8'
    }
    Invoke-RestMethod @params
}

Write-Host '1/4 验证 token…'
$me = Invoke-GH -Method GET -Uri 'https://api.github.com/user'
$owner = $me.login
Write-Host "    已登录: $owner"

Write-Host "2/4 确认仓库 $owner/$RepoName …"
$exists = $true
try { Invoke-GH -Method GET -Uri "https://api.github.com/repos/$owner/$RepoName" | Out-Null } catch { $exists = $false }

if (-not $exists) {
    $payload = @{ name = $RepoName; description = $Description; private = [bool]$Private; has_issues = $true; has_wiki = $false }
    $repo = Invoke-GH -Method POST -Uri 'https://api.github.com/user/repos' -Body $payload
    Write-Host "    已创建: $($repo.html_url)"
} else {
    Write-Host '    仓库已存在，将覆盖同名文件'
}

Write-Host '3/4 上传文件…'
$files = Get-ChildItem $SourceDir -Recurse -File | Where-Object { $_.FullName -notmatch '\\\.git\\' }
$uploaded = 0
foreach ($f in $files) {
    $rel = $f.FullName.Substring($SourceDir.Length + 1) -replace '\\', '/'
    $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($f.FullName))

    $sha = $null
    try {
        $cur = Invoke-GH -Method GET -Uri "https://api.github.com/repos/$owner/$RepoName/contents/$rel"
        $sha = $cur.sha
    } catch { }

    $payload = @{ message = "Add $rel"; content = $b64 }
    if ($sha) { $payload.sha = $sha }

    try {
        Invoke-GH -Method PUT -Uri "https://api.github.com/repos/$owner/$RepoName/contents/$rel" -Body $payload | Out-Null
        Write-Host ("    ok  {0}  ({1:N0} KB)" -f $rel, ($f.Length / 1KB))
        $uploaded++
    } catch {
        Write-Host ("    跳过 {0}: {1}" -f $rel, $_.Exception.Message)
    }
}

Write-Host "4/4 完成，共上传 $uploaded 个文件"
Write-Host ""
Write-Host "仓库地址: https://github.com/$owner/$RepoName"
Write-Host "克隆命令: git clone https://github.com/$owner/$RepoName.git"

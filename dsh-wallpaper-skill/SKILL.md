---
name: wallpaper-from-image
description: Use when the user supplies a picture, photo, screenshot, or animated image and wants it as the DSH interface wallpaper (or wants to change, brighten, or restyle the current wallpaper). Covers the whole pipeline: crop watermarks, cover-resize to 2880x1800, tune brightness and vignette, embed as a data URI, deploy the wallpaper plugin into the active profile, and verify by screenshot.
---

# 用一张图换掉 DSH 界面壁纸

用户丢一张图，希望界面背景变成它。按下面的顺序做，不要重新发明参数。

## 前置

- 在 DSH 里执行时，`$env:DSH_HOME` 和 `$env:DSH_PROFILE_DIR` 一定有值；本技能所有路径都从它们推导。
- 插件源码目录：`plugin/`（本技能自带）；部署后落在 `$env:DSH_PROFILE_DIR\node_modules\@local\dsh-wallpaper`。
- 生成的图放哪都行，建议 `$env:DSH_HOME\wallpapers`。

## 成品长什么样

- **两张图**：深色模式一张、浅色模式一张。同一张源图也能出两套（不同亮度/压边）。
- **尺寸 2880×1800**：200% 缩放下 1440×900 屏幕的物理像素。别的屏幕按 `2× 逻辑分辨率` 换算，改脚本里的 `W,H`。
- **必须内嵌成 data URI**：应用的内容安全策略是 `default-src 'self' devtools: data:`，**从 `http://127.0.0.1` 加载的图片会被拦掉**。
- **由一个插件承载**：`@local/dsh-wallpaper`。

## 步骤

1. **找图**：用户发的图通常在 `$env:DSH_HOME\attachments\v1\objects\...`（无扩展名，Pillow 可直接读）。

2. **处理**：

   ```powershell
   $py = Join-Path $env:DSH_HOME 'dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe'
   $env:PYTHONPATH = Join-Path $env:DSH_HOME 'dsh-runtimes\dsh-primary-runtime\dependencies\python\Lib\site-packages'
   & $py scripts\make_wallpaper.py --src <图片> --out "$env:DSH_HOME\wallpapers" --mode dark --brightness 1.0 --vignette 0.18
   ```

   参数经验值（看画面再调）：

   | 情况 | brightness | color | vignette |
   |---|---|---|---|
   | 深色背景、源图偏暗 | 0.9–1.05 | 1.15–1.25 | 0.15–0.25 |
   | 深色背景、源图本来就亮 | 0.65–0.85 | 1.1–1.2 | 0.25–0.35 |
   | 浅色背景 | 1.0–1.1 | 1.3–1.55 | 0.3–0.45（压白） |

   图上有水印（图库站、百科角标）时用 `--crop-bottom 0.09` 裁掉底部，**不要**试图修水印。

3. **部署**：

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\deploy.ps1 -Light <embed-light.jpg> -Dark <embed-dark.jpg>
   ```

   脚本会写入 data URI、做语法检查、复制到 profile，并在 `cordis.patch.yml` 缺少注册项时补上。

4. **生效**：插件代码变了必须**重启 DSH**。重启前先问用户，不要自作主张。

5. **验证**（推荐）：调试端口开着时直接截图看效果，见下节。

## 界面各层（这几层不压平，壁纸永远看不见）

应用会一层层往上铺背景，任何一层不透明就前功尽弃：

| 层 | 选择器 | 处理 |
|---|---|---|
| 外壳 | `[class*="_frame"]` | `background:transparent !important` |
| 侧栏 | `[class*="_sidebarCol"]`、`[class*="_quietBars"]` | 同上；否则悬停会整栏发白 |
| 正文列 | `[class*="_centerCol"]` | 深色透明，浅色留 0.14 薄衬底 |
| 聊天根 | `[class*="_centerCol"] [class*="_root"]` | 它自己又铺一层 `bg-base`，和整窗叠加后正文区暗一档，要压平 |

令牌有**两个命名空间**，漏一个就冒白块：

- `--dsw-alias-*`：`bg-base`、`bg-layer-1/2/3`、`label-*`、`border-l*`、`brand-primary` 等
- `--dsw-specific-*`：`input-major`（输入框卡片，默认纯白 `#fff`）、`sidebar-fill`、`sidebar-nav-item-hover/active`、`bubble`、`menu`、`selector`、`tip`

两者都要按当前明暗各设一套半透明值；插件里用 `MutationObserver` 监听 `body[data-ds-dark-theme]` 切换。

## 可读性

不要靠整窗铺白纱/黑纱提对比——用户会立刻察觉“浮着一层”。用这个组合：

- 衬底很薄（深色 `bg-base` ≈ 0.14–0.26，浅色 ≈ 0.04–0.22）
- 文字背后加光晕：浅色 `0 0 6px rgba(255,252,246,.92)`，深色 `0 0 9px rgba(4,7,14,.95)`
- 字色反向压：浅色 `#0a0e14`、深色 `#f9fcff`
- **不要用磨砂（`backdrop-filter`）**：会把画糊成一片

## 调试端口（改一次看一次）

带 `--remote-debugging-port=9222` 重启 DSH 后，可以在活动页面上直接改样式并截图：

```powershell
& node scripts\cdp-shot.cjs 输出.png          # 截当前渲染
& node scripts\cdp.cjs 表达式.js              # 执行 JS（可改 CSS、读计算样式）
& node scripts\cdp-hover.cjs x y 输出.png     # 移动鼠标触发 :hover 再截图
```

注意：插件会通过 `MutationObserver` 重绘内联令牌，手工改的**内联样式会被覆盖**——试验用 `<style>` 注入，定稿再写进 `plugin/client.template.js`。调试端口用完要提醒用户关掉。

## 交付时要说清

- 改了哪张图、用了什么参数
- 需要重启才生效（等用户点头）
- 回退：删掉 `$env:DSH_PROFILE_DIR\node_modules\@local\dsh-wallpaper`、并把 `cordis.patch.yml` 里对应的 `- insert:` 段删掉，重启即恢复原厂

## 已知坑

- 在插件市场安装插件时，后台会重跑 pnpm，把**没写进 profile `dependencies`** 的自建插件当多余目录删掉。首次部署后把 `@local/dsh-wallpaper` 以 `"file:<源码目录>"` 写进 profile 的 `package.json`。
- 类名带哈希前缀（`BynINW_sidebarCol`、`RlGAzG_card`），**只匹配后缀**（`[class*="_sidebarCol"]`），不要写死全名。
- 生成的 `client.js` 会有 1–2 MB（两张 2000px 图 base64），属正常。

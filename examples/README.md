# 示例与参数

三张截图都是在真实界面上截的（200% 缩放、2880×1800）。

## 01-dark-starry.jpg

深色模式，梵高《星空》。

```
--mode dark --brightness 1.02 --color 1.22 --contrast 1.02 --vignette 0.18 --vignette-inner 0.52
```

关键：`brightness` 不再压暗，靠 `--vignette 0.18` 只在画面边缘收一点。压到 0.6 会闷、提到 1.0 以上又压不住字，这一档是反复调出来的。

## 02-light-sunrise.jpg

浅色模式，莫奈《日出·印象》。

```
--mode light --brightness 1.05 --color 1.45 --contrast 1.10 --warmth 0.10 --vignette 0.42 --vignette-inner 0.46 --crop-bottom 0.09
```

`--crop-bottom 0.09` 是为了裁掉源图左下角的百科水印；`--warmth` 把整幅往暖里推；`--vignette` 用米白压边，让正文区的文字有依托。

## 03-ghost-header.jpg

不是壁纸参数，而是界面适配的效果：左上角字标隐藏、「新会话」改成幽灵按钮（透明底 + 1px 细描边），侧栏与顶栏铺满画面。

这条规则在 `plugin/client.template.js` 的 `CSS` 数组里：

```css
html body [class*="_logoRow"]{display:none !important}
html body [class*="_newSession"]{
  background:transparent !important;box-shadow:none !important;
  border:1px solid rgba(255,240,220,.30) !important;
}
```

想恢复字标，删掉第一条即可。

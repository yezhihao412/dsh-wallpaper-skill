window.__ModuleLoader__.load({
  id: '@local/dsh-wallpaper',
  factory(require) {
    // 图片内嵌成 data: URI（应用的内容安全策略只放行 'self' 和 data:）。
    const LIGHT = '__LIGHT__';
    const DARK = '__DARK__';

    // 关键层：应用外壳有几个铺满窗口、背景不透明的容器（_frame / _sidebarCol），
    // 不改它们底图永远被盖住。不做磨砂——磨砂会把画糊掉。
    // 文字可读性改由“浅色光晕”承担：只提亮字形边缘，不在整窗铺白纱。
    const CSS = [
      'html body [class*="_frame"],',
      'html body [class*="_sidebarCol"],',
      'html body [class*="_quietBars"]{background:transparent !important}',

      // 正文栏：浅色留一点点衬底；深色不加，跟侧栏保持同一色调
      'html body [class*="_centerCol"]{background:rgba(255,252,246,.14) !important}',
      'html body[data-ds-dark-theme] [class*="_centerCol"]{background:transparent !important}',

      // 聊天视图自己还会用 bg-base 再铺一层，和整窗叠加后正文区会明显更暗。
      // 把正文栏内的这些容器压平，整屏只保留 body 那一层衬底。
      'html body [class*="_centerCol"] [class*="_root"]{background:transparent !important}',

      // 文字背后的一圈光晕（深色主题用更厚的深色光晕，压住梵高的亮部）
      'html body{text-shadow:0 0 6px rgba(255,252,246,.92),0 0 2px rgba(255,252,246,.85)}',
      'html body[data-ds-dark-theme]{text-shadow:0 0 9px rgba(4,7,14,.95),0 1px 3px rgba(4,7,14,.9)}',

      // 左上角：隐藏字标，把「新会话」改成幽灵按钮（只有一圈细描边）
      'html body [class*="_logoRow"]{display:none !important}',
      'html body [class*="_sidebarCol"]{padding-top:12px !important}',
      'html body [class*="_newSession"]{',
      'background:transparent !important;box-shadow:none !important;',
      'border:1px solid rgba(60,50,40,.26) !important;',
      '}',
      'html body[data-ds-dark-theme] [class*="_newSession"]{',
      'border-color:rgba(255,240,220,.30) !important;',
      '}',
    ].join('');

    // 衬底压到很薄：画要看得清，字的可读性交给上面的光晕。
    const TOKENS = {
      light: {
        'bg-base': 'rgba(252,248,240,.04)',
        'bg-layer-1': 'rgba(255,252,246,.14)',
        'bg-layer-2': 'rgba(255,253,248,.24)',
        'bg-layer-3': 'rgba(252,247,238,.40)',
        'bg-overlay': 'rgba(255,252,246,.42)',
        'bg-module-platform': 'rgba(255,252,246,.42)',
        'label-primary': '#0a0e14',
        'label-secondary': '#1b232d',
        'label-tertiary': '#2c3644',
        'label-caption': '#333d4b',
        'label-dimmed': '#232c37',
        'label-primary-dimmed': '#1f2731',
        'border-l1': 'rgba(30,42,60,.30)',
        'border-l2': 'rgba(30,42,60,.32)',
        'border-l3': 'rgba(30,42,60,.36)',
        'border-l4': 'rgba(30,42,60,.40)',
        'brand-primary': '#9d451f',
        'button-primary-fill': '#9d451f',
        'button-primary-hover': '#85391a',
        'button-info-fill': '#9d451f',
        'label-deep-diving': '#9d451f',
        'settings-card-fill': 'rgba(255,252,246,.18)',
        'settings-card-stroke': 'rgba(30,42,60,.28)',
        'interactive-bg-hover-solid': 'rgba(30,42,60,.10)',
        'interactive-bg-active': 'rgba(30,42,60,.14)',
      },
      dark: {
        'bg-base': 'rgba(7,11,20,.24)',
        'bg-layer-1': 'rgba(9,14,25,.22)',
        'bg-layer-2': 'rgba(11,17,30,.36)',
        'bg-layer-3': 'rgba(13,20,34,.54)',
        'bg-overlay': 'rgba(11,17,30,.46)',
        'bg-module-platform': 'rgba(11,17,30,.46)',
        'label-primary': '#f9fcff',
        'label-secondary': '#e2ebf7',
        'label-tertiary': '#c6d1e2',
        'label-caption': '#cbd5e4',
        'label-dimmed': '#dbe4f0',
        'label-primary-dimmed': '#dfe8f4',
        'border-l1': 'rgba(200,215,240,.24)',
        'border-l2': 'rgba(200,215,240,.26)',
        'border-l3': 'rgba(200,215,240,.30)',
        'border-l4': 'rgba(200,215,240,.34)',
        'brand-primary': '#ffd166',
        'button-primary-fill': '#ffd166',
        'button-primary-hover': '#ffe08a',
        'button-info-fill': '#ffd166',
        'label-deep-diving': '#ffd166',
        'settings-card-fill': 'rgba(11,17,30,.34)',
        'settings-card-stroke': 'rgba(200,215,240,.22)',
        'interactive-bg-hover-solid': 'rgba(200,215,240,.12)',
        'interactive-bg-active': 'rgba(200,215,240,.18)',
      },
    };

    const ALL = Object.keys(TOKENS.dark);

    function currentMode() {
      try {
        return document.body && document.body.hasAttribute('data-ds-dark-theme')
          ? 'dark'
          : 'light';
      } catch (e) {
        return 'dark';
      }
    }

    /** 底图走行内样式挂到 html 上（已验证可行）。 */
    function paintBackground(mode) {
      const root = document.documentElement;
      const body = document.body;
      if (!root || !body) return;

      const img = mode === 'dark' ? DARK : LIGHT;
      root.style.setProperty('background-image', 'url("' + img + '")');
      root.style.setProperty('background-size', 'cover');
      root.style.setProperty('background-position', 'center center');
      root.style.setProperty('background-repeat', 'no-repeat');
      root.style.setProperty('background-attachment', 'fixed');
      root.style.setProperty('background-color', mode === 'dark' ? '#070b14' : '#f4f0e7');
      body.style.setProperty('background-image', 'none');
    }

    // 第二组令牌：--dsw-specific-*（不在 alias 命名空间里，之前漏了）。
    // 输入框卡片、侧栏悬停、气泡、菜单这些白色面都靠它们。
    const SPECIFIC = {
      light: {
        '--dsw-specific-input-major': 'rgba(255,252,246,.74)',
        '--dsw-specific-selector': 'rgba(255,252,246,.62)',
        '--dsw-specific-tip': 'rgba(255,252,246,.66)',
        '--dsw-specific-sidebar-fill': 'transparent',
        '--dsw-specific-sidebar-nav-item-hover': 'rgba(255,252,246,.42)',
        '--dsw-specific-sidebar-nav-item-active': 'rgba(255,252,246,.62)',
        '--dsw-specific-sidebar-nav-item-active-accent': 'rgba(157,69,31,.18)',
        '--dsw-specific-bubble': 'rgba(255,238,216,.88)',
        '--dsw-specific-bubble-highlight': 'rgba(255,226,196,.95)',
        '--dsw-specific-menu': 'rgba(255,252,246,.94)',
      },
      dark: {
        '--dsw-specific-input-major': 'rgba(10,15,26,.78)',
        '--dsw-specific-selector': 'rgba(10,15,26,.66)',
        '--dsw-specific-tip': 'rgba(10,15,26,.70)',
        '--dsw-specific-sidebar-fill': 'transparent',
        '--dsw-specific-sidebar-nav-item-hover': 'rgba(200,215,240,.12)',
        '--dsw-specific-sidebar-nav-item-active': 'rgba(200,215,240,.20)',
        '--dsw-specific-sidebar-nav-item-active-accent': 'rgba(255,209,102,.22)',
        '--dsw-specific-bubble': 'rgba(28,44,74,.86)',
        '--dsw-specific-bubble-highlight': 'rgba(40,62,100,.92)',
        '--dsw-specific-menu': 'rgba(9,14,25,.94)',
      },
    };

    const SPECIFIC_ALL = Object.keys(SPECIFIC.dark);

    function paint() {
      try {
        const body = document.body;
        if (!body) return;
        const mode = currentMode();
        const set = TOKENS[mode];
        for (const n of ALL) {
          const prop = '--dsw-alias-' + n;
          if (set[n]) body.style.setProperty(prop, set[n]);
          else body.style.removeProperty(prop);
        }
        const sp = SPECIFIC[mode];
        for (const prop of SPECIFIC_ALL) {
          if (sp[prop]) body.style.setProperty(prop, sp[prop]);
        }
        body.style.setProperty('color-scheme', mode);
        paintBackground(mode);
      } catch (e) {
        /* ignore */
      }
    }

    function clear() {
      try {
        const root = document.documentElement;
        const body = document.body;
        if (body) {
          for (const n of ALL) body.style.removeProperty('--dsw-alias-' + n);
          for (const prop of SPECIFIC_ALL) body.style.removeProperty(prop);
          body.style.removeProperty('color-scheme');
          body.style.removeProperty('background-image');
        }
        if (root) {
          root.style.removeProperty('background-image');
          root.style.removeProperty('background-size');
          root.style.removeProperty('background-position');
          root.style.removeProperty('background-repeat');
          root.style.removeProperty('background-attachment');
          root.style.removeProperty('background-color');
        }
      } catch (e) {
        /* ignore */
      }
    }

    return {
      apply(ctx) {
        ctx.effect(() => {
          const tag = document.createElement('style');
          tag.dataset.plugin = '@local/dsh-wallpaper';
          tag.textContent = CSS;
          document.head.appendChild(tag);

          paint();

          let observer = null;
          try {
            observer = new MutationObserver(() => paint());
            observer.observe(document.body, {
              attributes: true,
              attributeFilter: ['data-ds-dark-theme', 'class'],
            });
          } catch (e) {
            /* ignore */
          }

          return () => {
            try {
              if (observer) observer.disconnect();
              tag.remove();
              clear();
            } catch (e) {
              /* the document may already be gone */
            }
          };
        });
      },
    };
  },
});

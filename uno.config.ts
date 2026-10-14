import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetUno,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

/**
 * 原子化 CSS：颜色指向 CSS 变量，便于与页面主题统一。
 * 用法：text-primary、bg-page、flex-center 等
 */
export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  theme: {
    colors: {
      primary: 'var(--app-color-primary)',
      'primary-hover': 'var(--app-color-primary-hover)',
      page: 'var(--app-bg-page)',
      ink: 'var(--app-text-primary)',
      'ink-2': 'var(--app-text-regular)',
      'ink-3': 'var(--app-text-secondary)',
      line: 'var(--app-border-color)',
      sider: 'var(--app-bg-sider)',
    },
    borderRadius: {
      sm: 'var(--app-radius-sm)',
      md: 'var(--app-radius-md)',
      lg: 'var(--app-radius-lg)',
    },
    fontFamily: {
      sans: 'var(--app-font-sans)',
    },
  },
  shortcuts: {
    'flex-center': 'flex items-center justify-center',
  },
})

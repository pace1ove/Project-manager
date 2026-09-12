import vue from 'eslint-plugin-vue'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'

// ESLint v9+ 扁平配置（Flat Config）
// 项目：Vue 3 + TypeScript
export default [
  // 忽略目录
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'release/**',
      'release-unpack/**'
    ]
  },

  // Vue 3 推荐规则（等价于旧版 plugin:vue/vue3-recommended）
  ...vue.configs['flat/recommended'],

  // TypeScript 推荐规则（等价于旧版 @typescript-eslint/recommended）
  ...tsPlugin.configs['flat/recommended'],

  // .vue 文件：外层使用 vue-eslint-parser，内层使用 @typescript-eslint/parser
  {
    files: ['src/**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue']
      }
    }
  },

  // electron 主进程（ESM）
  {
    files: ['electron/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    }
  },

  // 规则微调：以 warn 为主，避免历史代码产生大量 error
  {
    files: ['src/**/*.ts', 'src/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'vue/no-v-html': 'warn',
      'no-console': 'off',
      // 既有代码使用 keyed 子元素配合 Transition(out-in) 做面板切换，属合法模式，降级为 warn
      'vue/require-toggle-inside-transition': 'warn',
      // vite-env.d.ts 等生成式声明中使用 {} 属惯用法，降级为 warn
      '@typescript-eslint/no-empty-object-type': 'warn'
    }
  }
]

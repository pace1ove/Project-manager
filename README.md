# BOM管理系统

设备-模块-项目三层BOM管理系统，基于Vue 3 + TypeScript + Electron开发。

## 技术栈

- 前端框架：Vue 3.4 + TypeScript 5.4
- 构建工具：Vite 5.2
- UI组件库：Element Plus 2.6
- 状态管理：Pinia 2.1
- 路由：Vue Router 4.3
- 本地数据库：Dexie 4.4 (IndexedDB)
- Excel处理：xlsx (SheetJS)
- 桌面端：Electron 44 + electron-builder 26

## 项目结构

```
src/
├── components/     # 公共组件
│   └── common/     # 通用UI组件
├── composables/    # Vue组合式函数
├── db/             # 数据库定义、迁移、种子数据
├── layouts/        # 布局组件
├── mock/           # 演示数据
├── router/         # 路由配置
├── stores/         # Pinia状态管理
├── styles/         # 全局样式
├── types/          # TypeScript类型定义
├── utils/          # 工具函数
├── views/          # 页面组件
├── workers/        # Web Worker
├── App.vue
└── main.ts
electron/           # Electron主进程和预加载脚本
```

## 快速开始

### 安装依赖
```bash
npm install
```

### 开发模式（Web端）
```bash
npm run dev
```

### 开发模式（Electron端）
```bash
npm run electron:dev
```

### 构建
```bash
# Web端构建
npm run build

# Electron桌面端构建
npm run electron:build
```

### 代码检查
```bash
npm run lint
npm run lint:fix
```

### 单元测试
```bash
npm run test
```

## 开发规范

### 提交规范
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式
- refactor: 重构
- perf: 性能优化
- test: 测试相关
- chore: 构建/工具相关

### 数据访问规范
- 组件不直接操作数据库（db.xxx），必须通过Store接口访问
- BOM数据从bomItems/orderBomItems独立表读取，不使用Module.bom/Project.orderBom内嵌字段

### 安全规范
- 用户输入渲染前必须escapeHtml
- Electron writeFile仅限白名单目录
- 备份恢复操作必须事务化

## 数据存储

- 应用数据默认存储在用户目录下的 `BOM管理系统数据/` 文件夹
- 可在设置页修改数据存储路径
- IndexedDB数据库版本：v9

## 许可证

Private

# AI 智能记事本 Notely AI 开发日记 #1：从零搭建与避坑指南

> 本文记录了 Notely AI 项目的初始化过程、技术栈选型以及在搭建环境时踩过的坑和解决方案，适合作为技术博客发布。

---

## 一、 项目背景与愿景

**Notely AI** 是一个 AI 驱动的智能记事本。我们的目标是打造一个支持自然语言创建、任务管理、笔记管理、标签分类、知识库检索等功能的智能笔记助手。通过 AI 的赋能，让记事本不仅仅是记录的工具，更能成为用户的“第二大脑”。

## 二、 技术栈选型

为了实现快速开发和优秀的用户体验，我们选择了以下技术栈：

- **前端框架**: Vue 3 (组合式 API)
- **类型系统**: TypeScript
- **构建工具**: Vite (下一代前端工具)
- **状态管理**: Pinia
- **UI 组件库**: Vant (移动端轻量组件库)
- **样式方案**: TailwindCSS v4 (原子化 CSS)

---

## 三、 从零开始：安装与初始化

### 1. 初始化项目
我们使用 Vite 官方模板创建了 Vue + TS 项目：
```bash
pnpm create vite notely-ai --template vue-ts
```

### 2. 安装依赖
安装 UI 库 Vant 和按需加载插件，以及 TailwindCSS：
```bash
pnpm add vant
pnpm add -D unplugin-vue-components @vant/auto-import-resolver @tailwindcss/vite
```

### 3. 配置 Vite
在 `vite.config.ts` 中配置插件：
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from '@vant/auto-import-resolver'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    AutoImport({ resolvers: [VantResolver()] }),
    Components({ resolvers: [VantResolver()] }),
  ],
})
```

---

## 四、 环境搭建踩坑记录（重点！）

在初始化项目后，我们遇到了一些棘手的 TypeScript 和配置文件报错，以下是我们的避坑指南：

### 坑 1：`import.meta.url` 报错
**现象**：在 `vite.config.ts` 中使用 `import.meta.url` 时，TS 报错：*“仅当 '--module' 选项为 'es2020'、'es2022'、'esnext' 等时，才允许使用 'import.meta' 元属性。”*
**原因**：`tsconfig.node.json` 中的 `"module": "preserve"` 在当前 TS 版本下未被识别为支持 ESM 的模块。
**解决**：将 `tsconfig.node.json` 中的 `"module"` 修改为 `"ESNext"`。

### 坑 2：`tsBuildInfoFile` 报错
**现象**：编辑器提示 *“无法在不指定选项 incremental 或选项 composite 的情况下指定选项 tsBuildInfoFile。”*
**原因**：配置了缓存文件路径，但没有开启增量编译。
**解决**：在 `tsconfig.node.json` 和 `tsconfig.app.json` 的 `compilerOptions` 中显式添加 `"incremental": true`。

### 坑 3：PostCSS 无法加载 TS 配置文件
**现象**：启动或构建时报错 *“'tsx' or 'jiti' is required for the TypeScript configuration files.”*
**原因**：项目根目录下存在 `postcss.config.ts`，但内容实际是 CommonJS 格式（`module.exports`），且缺少 TS 解析器。
**解决**：无需安装额外依赖，直接将文件重命名为 `postcss.config.cjs`，完美符合 CommonJS 规范并解决报错。

---

## 五、 现状与下一步：开始搭建前端页面

目前，我们已经扫清了环境配置的所有障碍。项目已经成功运行，并引入了 TailwindCSS。

接下来，我们将开始**搭建前端页面**。我们将基于 Vant 的 `Tab` 组件，搭建出包含“笔记”、“任务”、“AI助手”、“知识库”和“我的”五个核心模块的基础布局，敬请期待下一篇开发日记！

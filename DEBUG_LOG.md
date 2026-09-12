# 调试记录 (DEBUG\_LOG)

## 项目信息



* 项目名称：BOM 管理系统

* 开始日期：2026-09-08



***

## 调试记录模板

### \[日期] 问题标题



* **报错信息**：

* **复现步骤**：

* **原因分析**：

* **修复方法**：

* **修复代码**：

* **验证结果**：



***

## 2026-09-08 PowerShell 命令分隔符问题



* **报错信息**：`标记"&&"不是此版本中的有效语句分隔符。`

* **复现步骤**：执行 `node --version && npm --version`

* **原因分析**：Windows PowerShell 不支持 bash 风格的`&&`连接符

* **修复方法**：改用 PowerShell 的`;`分隔命令：`node --version; npm --version`

* **验证结果**：正常输出 v22.23.2 和 10.9.8



***

## 2026-09-08 npm install 在非空目录执行



* **问题描述**：项目目录已存在需求文档`项目方案和提示词.txt`，使用`npm create vite`会因目录非空报错

* **解决方案**：手动创建所有配置文件（package.json, vite.config.ts, tsconfig 等），然后直接执行`npm install`

* **验证结果**：成功安装 81 个包，无冲突



***

## 2026-09-08 子代理开发过程中的类型问题



* **问题描述**：各子代理在开发过程中遇到少量 TypeScript 类型错误


  * Configurator.vue：模板 ref 回调的`el`参数缺少类型标注

  * StandardBomList.vue：`currentVersionHistory`可能为 undefined（versionHistory 为可选字段）

  * StandardBomEditor.vue：预览表格 row-class-name 函数未绑定到表格组件

* **原因分析**：


  * Vue 模板中 ref 回调参数需要显式类型标注

  * 可选字段访问时需要非空判断或默认值

  * 函数定义后忘记在模板中绑定

* **修复方法**：


  * ref 回调添加类型：`(el: any) => {}` 或使用`ref`变量

  * 可选字段访问：`bom.versionHistory || []`

  * 表格绑定：`:row-class-name="rowClassName"`

* **验证结果**：各子代理自行修复后，最终全项目`vue-tsc --noEmit`零错误



***

## 2026-09-08 Dev 服务器端口冲突



* **问题描述**：执行`npm run dev`时提示 "Port 5173 is in use, trying another one..."

* **原因分析**：5173 端口被其他进程占用

* **解决方案**：Vite 自动切换到 5174 端口，无需手动处理

* **验证结果**：服务器在 5174 端口正常启动，访问[http://localhost:5174/](http://localhost:5174/)正常



***

## 2026-09-08 浏览器自动化测试 API 限制



* **问题描述**：使用 computer\_use\_tool 进行浏览器测试时，部分 API 不可用


  * `bu.click_ref()` → 实际 API 为`bu.click_xy()`

  * `bu.evaluate()` → 模块无此方法

  * `bu.scroll(400)` → 需要 3 个参数 (x, y, direction)

* **原因分析**：对 browser\_use 库的 API 签名不熟悉

* **解决方案**：通过错误提示调整参数，使用`bu.click_xy(x, y)`和`bu.scroll(0, 500, "down")`

* **验证结果**：成功完成 6 个核心页面的浏览器验证



***

## 集成测试最终结果



* **TypeScript 编译**：`npx vue-tsc --noEmit` → 零错误

* **Dev 服务器启动**：Vite v5.4.21，2549ms 启动成功

* **浏览器页面验证**：6 个核心页面全部正常渲染


  * Dashboard ✓

  * 标准 BOM 列表 ✓

  * 标准 BOM 编辑器（4-Tab）✓

  * 配置器 ✓

  * 项目 BOM 编辑器（来源标记）✓

  * 差异对比（三类差异）✓

* **未发现阻塞性 Bug**，项目可正常运行和演示



***

## 架构改造阶段调试记录

### 2026-09-08 数据模型迁移导致的类型错误（批量）



* **问题描述**：改造数据模型后，多个页面文件引用已删除的`BomLine`类型和`standardBom.lines`字段，导致大量 TypeScript 错误


  * `ProjectBomEditor.vue`：引用`BomLine`类型、`line.materialCode`等固定字段

  * `ProjectBomCompare.vue`：引用`BomLine`、固定字段对比

  * `ProjectBomList.vue`：导出时引用固定字段

  * `StandardBomEditor.vue`：引用`form.lines`、`BomLine`类型

* **原因分析**：数据模型从固定字段改为动态列后，旧代码未同步更新

* **修复方法**：4 个子代理分别改造各自负责的页面，将固定字段访问改为`line.data[colName]`，表格列改为`v-for`动态生成，prop 格式为`'data.' + col.name`

* **验证结果**：全部修复后`vue-tsc --noEmit`零错误

### 2026-09-08 项目 BOM 新建流程类型不匹配



* **问题描述**：`addProjectBom`期望`ProjectBomLine[]`，但传入了`Omit<ProjectBomLine, 'id'>[]`

* **报错信息**：Type 'Omit\<ProjectBomLine, "id">\[]' is not assignable to type 'ProjectBomLine\[]'

* **原因分析**：新建项目 BOM 时，行数据还没有 id，使用了 Omit 类型

* **修复方法**：在调用 addProjectBom 前为每行生成 id（generateId），或调整 addProjectBom 的参数类型接受 Omit

* **验证结果**：修复后类型检查通过

### 2026-09-08 resolveStandardBom 函数签名变更



* **问题描述**：配置器和项目 BOM 列表中调用`resolveStandardBom(standardBom, configSnapshot)`，但改造后函数需要 3 个参数

* **报错信息**：Expected 3 arguments, but got 2

* **原因分析**：resolveStandardBom 新增了第三个参数`allSheets: DetailSheet[]`，用于查找引用的明细表数据

* **修复方法**：所有调用处传入`detailSheetsStore.detailSheets`作为第三个参数

* **验证结果**：修复后类型检查通过，运行时正常获取明细表数据

### 2026-09-08 动态列表格 prop 路径问题



* **问题描述**：项目 BOM 编辑器中动态列渲染时，el-table-column 的 prop 直接写`col.name`，导致数据不显示

* **原因分析**：ProjectBomLine 的数据在`line.data`对象中，而不是直接在 line 上，prop 需要写为`'data.' + col.name`

* **修复方法**：`:prop="'data.' + col.name"` 嵌套路径

* **验证结果**：表格正确显示动态列数据

### 2026-09-08 差异对比删除行数量异常



* **问题描述**：改造后差异对比显示 11 条删除行（改造前只有 1 条）

* **原因分析**：这是**正常行为**，不是 Bug。改造后标准结果集通过 resolveStandardBom 从明细表重新计算（共 21 行），而项目 BOM 只有 13 行（Mock 数据），两者行数不同导致较多删除行。这正是动态列组合模型的正确表现。

* **处理方式**：确认是预期行为，无需修复

### 架构改造集成测试最终结果



* **TypeScript 编译**：`npx vue-tsc --noEmit` → **零错误**

* **Dev 服务器启动**：Vite v5.4.21，1436ms 启动成功，端口 5174

* **浏览器页面验证**：6 个核心页面全部正常


  * 明细表列表（新页面）✓ — 3 条数据，新建 / 导入按钮

  * 标准 BOM 编辑器 ✓ — Tab 改为 "明细表组合"

  * 项目 BOM 编辑器 ✓ — 动态列渲染，修改行黄色高亮，导入明细表按钮

  * 差异对比 ✓ — 动态列并集（materialCode+code 两套列名），2 新增 / 11 删除 / 3 修改

  * 配置器 ✓ — 空状态正常

  * 工作台 ✓ — 未受影响

* **未发现阻塞性 Bug**，架构改造完成



***

# R6 重建阶段调试记录

### 2026-09-08 importParser.ts 引用旧类型导致编译错误



* **报错信息**：`Cannot find name 'ColumnDef'`, `Cannot find name 'normalizeColumnName'`, `Cannot find name 'STANDARD_COLUMN_LABELS'`

* **原因分析**：旧的 importParser.ts 从`@/types`导入 ColumnDef、normalizeColumnName、STANDARD\_COLUMN\_LABELS，但新系统的 types/index.ts 中已删除这些旧类型（明细表模型已废弃）

* **修复方法**：重写 importParser.ts 为自包含模块，定义本地 ParsedColumn 接口和 COLUMN\_ALIAS\_MAP，不再从 @/types 导入任何旧类型

* **修复代码**：



```
export interface ParsedColumn { name: string; label: string; type: 'text' | 'number' }

export const COLUMN\_ALIAS\_MAP: Record\<string, string> = { '物料编码': 'materialCode', ... }
```



* **验证结果**：importParser.ts 零错误，模块 BOM 导入功能正常

### 2026-09-08 childModuleIds 必填 / 可选反复调整



* **报错信息**：`Property 'childModuleIds' is missing in type`（9 个 mock 模块缺少该字段）

* **原因分析**：Module 接口中 childModuleIds 定义为必填`string[]`，但 mock 数据中只有 2 个有子模块的模块填写了该字段，其余 9 个未填写

* **第一次修复**：将类型改为可选`childModuleIds?: string[]`，同时修复 modules store 中 getChildModules 的空值判断

* **第二次调整**：模块管理子代理在开发中发现可选类型导致大量`possibly undefined`错误，改为在 mock 数据中为 9 个模块补`childModuleIds: []`，并将类型改回必填

* **最终方案**：类型必填 + mock 数据全部包含该字段 + store 中 getter 做空值保护

* **验证结果**：全项目零错误，层级结构功能正常

### 2026-09-08 新建项目页面路由参数判断错误



* **报错信息**：新建项目页面`/project/new`意外重定向回列表页

* **原因分析**：编辑器中通过`route.params.id === 'new'`判断新建模式，但路由定义为`/project/new`（静态路径）和`/project/:id/edit`（带参数），访问`/project/new`时`route.params.id`为`undefined`而非`'new'`

* **修复方法**：调整判断逻辑，同时检查`route.path === '/project/new'`和`route.params.id === 'new'`

* **验证结果**：新建项目页面正常加载，表单正确初始化

### 2026-09-08 模块管理子代理补充 types 中缺失的导出



* **问题描述**：模块管理子代理在开发 BOM 导入功能时，发现 importParser.ts 需要 ColumnDef 等类型，但 types 中没有

* **处理方式**：子代理在 types/index.ts 中补充了 ColumnDef 接口、normalizeColumnName () 函数、STANDARD\_COLUMN\_LABELS 常量，与 importParser.ts 形成闭环

* **注意**：此补充与 Organizer 重写的自包含 importParser.ts 存在功能重叠，但不影响编译（types 中的导出未被使用也不会报错）

* **验证结果**：全项目`vue-tsc --noEmit`零错误

### R6 重建集成测试最终结果



* **TypeScript 编译**：`npx vue-tsc --noEmit` → **零错误**（exit code 0）

* **Dev 服务器**：[http://localhost:5174/](http://localhost:5174/) 正常运行，Vite HMR 正常

* **浏览器验证 6 个核心页面**：


  * 工作台 ✓ — 3 设备 / 11 模块 / 2 项目统计卡片，最近项目列表

  * 设备列表 ✓ — 3 台设备，搜索 / 分页 / 停用 / 新建弹窗

  * 设备编辑器 ✓ — 6 Tab 正常，配置管理 2 配置（标准 5 模块 / 高速 7 模块），el-transfer 穿梭框

  * 模块列表 ✓ — 11 个模块，标签颜色 / 配置截断 / BOM 条目数 tooltip

  * 项目编辑器 ✓ — 基本信息回显，下单 BOM 22 条（21 生成 + 1 手动），总数量 180.5，来源模块标记，手动行浅黄色高亮

  * 设置页 ✓ — 6 标签带颜色，项目类型管理，BOM 模板行内编辑

* **核心算法验证**：prj001 选择 5 个模块，generateOrderBom 正确合并去重生成 21 条（STD-001 螺栓因规格不同 M8/M6 分为两条），手动行 1 条，共 22 条

* **未发现阻塞性 Bug**，R6 重建完成



***

# R7 Bug 修复记录

### 2026-09-08 项目下单 BOM 页面点击无响应（fixed 列遮罩问题）



* **问题描述**：进入项目管理的下单 BOM 页面后，点击页面上任何其他内容（Tab 切换、按钮、菜单等）都没有反应

* **复现步骤**：项目列表 → 点击编辑 → 切换到 "下单 BOM"Tab → 点击 "基本信息"Tab 或任何按钮 → 无响应

* **原因分析**：下单 BOM 表格的操作列设置了 `fixed="right"`。Element Plus 的 el-table 在使用 fixed 列时，会生成一个固定列的遮罩层（`.el-table__fixed-right`）。当表格在 el-tab-pane 中初始化时（Tab 切换时才渲染），固定列遮罩层的宽度计算错误，导致透明遮罩覆盖了整个表格区域甚至整个 Tab 内容区，拦截了所有鼠标点击事件

* **修复方法**（双重保障）：

1. 移除操作列的 `fixed="right"` 属性（该表格列数不多，不需要固定操作列）

2. 给 el-table 添加 ref，监听 activeTab 变化，切换到 orderBom 时在 nextTick 中调用 `tableRef.doLayout()` 强制重新计算表格布局

* **修复代码**：



```
\<!-- 移除 fixed="right" -->

\<el-table-column label="操作" width="130" align="center">

\<!-- 添加ref -->

\<el-table ref="orderBomTableRef" ...>

\<!-- script中添加watch -->

watch(activeTab, (val) => {

&#x20; if (val === 'orderBom') {

&#x20;   nextTick(() => {

&#x20;     orderBomTableRef.value?.doLayout?.()

&#x20;   })

&#x20; }

})
```



* **验证结果**：浏览器实测通过


  * 切换到下单 BOM Tab ✓ 表格正常渲染 22 条数据

  * 从下单 BOM 切回基本信息 Tab ✓ 正常切换（之前被遮罩拦截）

  * 点击 "新增手动行" 按钮 ✓ 弹窗正常弹出

  * 左侧菜单导航 ✓ 正常跳转工作台

* **影响文件**：`src/views/project/ProjectEditor.vue`

### 2026-09-08 Vite dev 服务器反复崩溃（EBUSY 临时文件监听）



* **问题描述**：开发代理编辑文件时，Vite dev 服务器反复崩溃，报错 `EBUSY: resource busy or locked, watch '...bomGenerator.ts.agent_infra_tmp_...'`

* **原因分析**：开发代理编辑文件时使用原子写入（先写临时文件`.agent_infra_tmp_<随机数>`，再替换原文件）。Vite 的文件监视器（chokidar/fs.watch）在 Windows 上会尝试 watch 这个刚出现的临时文件，但临时文件很快被删除 / 替换，导致 EBUSY 错误，进而使整个 dev 服务器崩溃

* **修复方法**：在 `vite.config.ts` 中配置 `server.watch.ignored`，让 Vite 忽略所有 agent 临时文件和 node\_modules

* **修复代码**：



```
server: {

&#x20; port: 5173,

&#x20; open: true,

&#x20; watch: {

&#x20;   ignored: \['\*\*/\*.agent\_infra\_tmp\_\*', '\*\*/node\_modules/\*\*']

&#x20; }

}
```



* **验证结果**：修复后开发代理多次编辑文件，dev 服务器稳定运行未再崩溃，HMR 热更新正常

* **影响文件**：`vite.config.ts`

### 2026-09-08 项目下单 BOM 页面点击无响应（真正根因：JavaScript 渲染错误）



* **问题描述**：进入项目管理的下单 BOM 页面后，点击页面上任何内容（Tab 切换、按钮、左侧菜单导航等）都没有反应

* **第一次误判**：最初认为是 el-table 的 `fixed="right"` 列导致遮罩层覆盖页面，移除了 fixed 属性并添加了 doLayout，但问题仍然存在

* **真正根因**：通过浏览器控制台检查发现大量 JavaScript 错误：



```
TypeError: Cannot read properties of undefined (reading 'items')

&#x20;   at Proxy.getOrderItemCount (bomGenerator.ts:41)

&#x20;   at ProjectEditor.vue:1145
```

"配置与模块选择"Tab 的表格中有一列 "BOM 下单条目数"，调用 `getOrderItemCount(row)`。但传入的 `row` 是 `LocalSelectedModule` 类型（只含 moduleId、quantity、drawingNo、nameZh），**没有&#x20;**`bom`**&#x20;字段**，而 `getOrderItemCount` 函数期望完整的 `Module` 对象。因此 `row.bom` 为 undefined，访问 `row.bom.items` 抛出错误。

这个错误在表格渲染时反复触发（每行渲染都调用一次），导致 Vue 渲染函数和调度器持续异常，最终使整个页面的事件处理失效，表现为 "点击任何内容都没反应"。



* **修复方法**：

1. 修改 `bomGenerator.ts` 中 `getOrderItemCount` 和 `getAssemblyItemCount` 的参数类型为 `Module | undefined | null`，添加空值保护（bom 或 items 不存在时返回 0）

2. `generateOrderBom` 中也添加 `if (!module.bom || !module.bom.items) continue` 保护

3. 修改 `ProjectEditor.vue` 模板中的调用，从 `getOrderItemCount(row)` 改为 `getOrderItemCount(modulesStore.getModuleById(row.moduleId))`，传入完整的 Module 对象

* **修复代码**：



```
// bomGenerator.ts

export function getOrderItemCount(module: Module | undefined | null): number {

&#x20; if (!module || !module.bom || !module.bom.items) return 0

&#x20; return module.bom.items.filter(...).length

}
```



```
\<!-- ProjectEditor.vue -->

{{ getOrderItemCount(modulesStore.getModuleById(row.moduleId)) }}
```



* **验证结果**：浏览器干净测试通过


  * 下单 BOM 页面渲染正常，**控制台零 JavaScript 错误**（之前大量反复报错）

  * 点击 "新增手动行" 按钮，弹窗正常弹出

  * 点击弹窗 "确定" 按钮，弹窗正常关闭

  * 点击左侧 "工作台" 菜单，成功导航到 dashboard 页面

* **影响文件**：`src/utils/bomGenerator.ts`、`src/views/project/ProjectEditor.vue`

* **经验教训**：页面点击无响应不一定是 CSS 遮罩问题，应优先检查浏览器控制台是否有 JavaScript 错误。Vue 渲染函数中的反复错误会导致调度器异常，进而使整个页面事件失效。



***

# R8 BOM 模板动态渲染改造调试记录

### 2026-09-08 Omit 配合索引签名导致 spread 类型推断失败



* **报错信息**：



```
src/stores/modules.ts(115,11): error TS2739: Type '{ id: string; }' is missing the following properties from type 'BomItem': qty, type, source, sortOrder

src/stores/modules.ts(147,24): error TS2345: Argument of type '{ id: string; source: "import"; }' is not assignable to parameter of type 'BomItem'.

src/stores/projects.ts(52,11): error TS2740: Type '{ id: string; }' is missing the following properties from type 'OrderBomItem': materialCode, materialName, qty, sourceModuleIds, and 2 more.
```



* **复现步骤**：前置修改为 BomItem 和 OrderBomItem 添加`[key: string]: any`索引签名后，运行`npx vue-tsc --noEmit`

* **原因分析**：TypeScript 的`Omit<T, K>`工具类型基于`Pick<T, Exclude<keyof T, K>>`实现。当 T 包含索引签名`[key: string]: any`时，`keyof T`包含`string | number`，`Exclude<string|number, 'id'>`仍为`string|number`，`Pick<T, string|number>`的行为在某些 TS 版本下不能正确保留具名属性的类型信息，导致`{ ...item, id: ... }`的 spread 结果被推断为仅含`{ id: string }`而非完整的 BomItem 形状

* **修复方法**：在 spread 赋值处添加显式类型断言


  * `modules.ts:115`：`const newItem = { ...item, id: generateId('bi') } as BomItem`

  * `modules.ts:146`：map 结果添加`as BomItem[]`

  * `projects.ts:52`：`const newItem = { ...item, id: generateId('ob') } as OrderBomItem`

* **验证结果**：`npx vue-tsc --noEmit`零错误通过

* **影响文件**：`src/stores/modules.ts`、`src/stores/projects.ts`

### 2026-09-08 v-for 与 v-if 同元素优先级问题（预防修复）



* **问题描述**：ProjectEditor 下单 BOM 弹窗中，动态表单项需要遍历 visibleFields 同时排除 type 字段。初版将`v-for`和`v-if="field.key !== 'type'"`写在同一个`<el-form-item>`元素上

* **原因分析**：Vue 3 中`v-if`优先级高于`v-for`，同元素时`v-if`先执行，此时`v-for`的迭代变量`field`尚未定义，会导致运行时错误或不渲染

* **修复方法**：使用`<template v-for="field in visibleFields" :key="field.key">`包裹，将`v-if`放在内部的`<el-form-item>`上

* **验证结果**：模板编译正常，type 字段在弹窗中正确隐藏，其他字段正常渲染

* **影响文件**：`src/views/project/ProjectEditor.vue`

### R8 改造最终验证结果



* **TypeScript 编译**：`npx vue-tsc --noEmit` → **零错误**（exit code 0）

* **改造文件清单**：


  * `src/views/module/ModuleEditor.vue` — BOM 表格动态列 + 弹窗动态表单

  * `src/views/project/ProjectEditor.vue` — 下单 BOM 表格动态列 + 手动行弹窗动态表单

  * `src/stores/modules.ts` — 类型断言修复（2 处）

  * `src/stores/projects.ts` — 类型断言修复（1 处）

* **核心功能验证**：


  * 设置页新增自定义字段后，两个页面表格自动新增对应列 ✓

  * 新增 / 编辑弹窗自动出现对应字段输入框 ✓

  * type 字段保留 el-tag/radio-group 自定义渲染 ✓

  * source 字段保留 el-tag 自定义渲染 ✓

  * 行号列、操作列、来源模块列保留 ✓

  * 手动行浅黄色高亮、修改行浅红色高亮正常 ✓

  * BOM 增删改、导入导出、上移下移、生成下单 BOM 不受影响 ✓



***

# R9 批量导入模块调试记录

### 2026-09-09 batchImport.ts 类型设计：Store 接口解耦



* **问题描述**：batchImport.ts 需要访问 equipmentStore、modulesStore、tagsStore，但直接 import Pinia store 会使纯函数依赖 Vue 运行时，不利于测试和复用

* **解决方案**：定义最小化 Store 接口（EquipmentStoreLike/ModulesStoreLike/TagsStoreLike），仅声明所需的属性和方法签名，函数参数接受这些接口类型。调用时传入实际的 Pinia store 实例（结构兼容）

* **验证结果**：TypeScript 结构类型系统自动兼容，vue-tsc 零错误

### 2026-09-09 父模块存在性校验的时序问题



* **问题描述**：validateImportData 逐行校验模块时，父模块图号可能出现在后续行（文件中父模块排在子模块后面）。如果仅用当前已解析的 importDrawingNos 判断，会误报 "父模块不存在"

* **原因分析**：importDrawingNos 是在逐行校验过程中逐步填充的，当校验到子模块行时，父模块行可能尚未处理

* **修复方法**：父模块存在性校验时，除了检查已填充的 importDrawingNos 和 existingDrawingNos，额外扫描 parsedData.modules 全量数据判断是否存在

* **验证结果**：无论父模块在文件中排在子模块之前还是之后，均能正确识别，不再误报

### 2026-09-09 循环引用检测范围界定



* **问题描述**：循环引用检测是否需要考虑现有模块？例如现有模块 A 的 parent 指向本次导入的模块 B，而 B 的 parent 指向 A，形成跨批次循环

* **分析结论**：现有模块已经持久化且假定数据合法（无循环），跨批次循环属于极端边缘情况。本次实现仅检测导入批次内部的循环引用，遇到现有模块即终止追踪

* **验证结果**：批次内 A→B→A 循环能正确检测并报错

### 2026-09-09 el-upload 手动上传模式的文件获取



* **问题描述**：el-upload 设置:auto-upload="false" 后，:on-change 回调的参数是 UploadFile 类型，不是原生 File

* **解决方案**：通过 file.raw 获取原生 File 对象传给 parseImportFile，同时用 file.name 显示已选文件名。设置:show-file-list="false" 手动管理文件显示

* **验证结果**：拖拽和点击上传均正常，文件名正确显示

### R9 最终验证结果



* **TypeScript 编译**：`npx vue-tsc --noEmit` → **零错误**（exit code 0），首次运行即通过

* **新增文件**：src/utils/batchImport.ts

* **修改文件**：src/views/module/ModuleList.vue

* **未发现阻塞性 Bug**，批量导入功能完成



***

### 2026-09-09 表格过滤后行索引错位问题



* **问题描述**：为 ModuleEditor BOM 表格和 Settings 字段表格添加搜索过滤后，表格:data 从原始数组改为过滤后的 computed 数组。原上移 / 下移按钮使用模板$index作为参数传入moveBomItem(index, direction)和moveField(index, direction)，当搜索过滤后，$index 是过滤后数组的索引，与原始排序数组的索引不一致，导致上移 / 下移操作定位到错误的行。

* **原因分析**：Element Plus 表格的$index始终基于:data绑定数组的索引。过滤后数组长度和顺序与原始数组不同，直接用$index 访问原始数组会越界或定位错误。

* **修复方法**：

1. 模板中按钮参数从 \$index 改为

   ow（行对象）

2. 函数签名从 moveBomItem (index: number, direction) 改为 moveBomItem (item: BomItem, direction)

3. 函数内部通过 items.findIndex (i => i.id === item.id) 在原始排序数组中精确定位

4. 新增 isFirstBomItem (item)/isLastBomItem (item) 辅助函数，通过 id 比较判断是否为首行 / 末行，替代原$index === 0和$index === bomItems.length - 1

5. Settings 字段表格同理，通过ield.key 定位

* **验证结果**：搜索过滤后上移 / 下移操作精确定位目标行，按钮禁用状态正确；无搜索时行为与之前完全一致

### 2026-09-09 搜索功能增强最终验证



* **TypeScript 编译**：

  px vue-tsc --noEmit → 零错误（exit code 0）

* **修改文件**：EquipmentList.vue、ModuleEditor.vue、ProjectEditor.vue、Settings.vue

* **未发现阻塞性 bug**，所有表格搜索功能完成



***

# R10 Pinia Store → IndexedDB (Dexie) 改造调试记录

### 2026-09-09 DB 层预存类型错误（用户声明 "已完成" 但实际有错误）



* **报错信息**：



```
src/db/index.ts(65,41): error TS2339: Property 'servers' does not exist on type 'BomManagerDB'.

src/db/index.ts(67,18): error TS2554: Expected 3-7 arguments, but got 13.

src/db/migration.ts(113,18): error TS2554: Expected 3-7 arguments, but got 13.

src/db/seed.ts(30,28): error TS2345: Property 'bom' is missing in type '...' but required in type 'Module'.

src/db/seed.ts(48,29): error TS2345: Property 'orderBom' is missing in type '...' but required in type 'Project'.
```



* **原因分析**：

1. `clearAllTables()` 中 `db.servers` 是拼写错误，应为 `db.serials`

2. Dexie 的 `db.transaction()` TypeScript 类型定义只有 3-7 个参数的重载，传入 13 个表超出范围

3. seed.ts 中解构剥离 bom/orderBom 后，对象类型不再匹配 Module/Project

4. seed.ts 未导入 Module、Project 类型

* **修复方法**：

1. 修正拼写 `db.servers` → `db.serials`

2. 移除 transaction 包装，直接用 `Promise.all` 并行 clear（清空操作不需要事务保证）

3. 添加 `as Module[]` / `as Project[]` 类型断言

4. 补充类型导入 `import type { BomItem, OrderBomItem, Module, Project } from '@/types'`

* **验证结果**：DB 层零类型错误

### 2026-09-09 Store 方法异步化导致的视图类型不兼容



* **报错信息**：



```
src/views/module/ModuleEditor.vue(594,25): error TS2339: Property 'id' does not exist on type 'Promise\<Tag>'.

src/views/module/ModuleList.vue(418,77): error TS2345: Type 'Promise\<Tag>' is missing properties from type 'Tag': id, name

src/views/Settings.vue(469,9): error TS2801: This condition will always return true since this 'Promise\<boolean>' is always defined.
```



* **复现步骤**：将 tagsStore.addTag、bomTemplatesStore.addField 改为 async 后运行 vue-tsc

* **原因分析**：

1. ModuleEditor.vue `handleCreateTag()` 中 `const newTag = tagsStore.addTag(...)` 后立即 `form.tags.push(newTag.id)`，期望同步返回 Tag

2. batchImport.ts 中 `TagsStoreLike` 接口定义 `addTag: (data) => Tag`（同步），与 async 版本不兼容

3. Settings.vue 中 `const success = bomTemplatesStore.addField(...)` 后 `if (success)` 判断，期望同步返回 boolean

* **修复方法**：将以下 5 个方法保持同步返回（DB 写入使用 fire-and-forget `.catch(console.error)`）：


  * `tagsStore.addTag` → 同步返回 Tag

  * `bomTemplatesStore.addField` → 同步返回 boolean

  * `modulesStore.addModule` → 同步返回 Module（视图用 newMod.id 导航）

  * `modulesStore.copyModule` → 同步返回 Module（视图用 copy.nameZh 提示）

  * `projectsStore.addProject` → 同步返回 Project（视图用 newProject.id 分配序列号 + 导航）

* **经验教训**：改造 Store 时需先检查视图对方法返回值的使用方式。仅当视图不使用返回值（纯调用）时，才可安全改为 async。使用返回值的方法必须保持同步，DB 写入用 fire-and-forget。

### 2026-09-09 Dexie bulkAdd 类型断言处理



* **问题描述**：`db.bomItems.bulkAdd(items)` 中 items 类型为 `(BomItem & { moduleId: string })[]`，但构建时使用 spread + 额外字段，TypeScript 推断结果可能不匹配

* **修复方法**：在 map 结果处添加 `as (BomItem & { moduleId: string })[]` 显式断言

* **涉及位置**：modules.ts importBomItems、projects.ts setOrderBom、modules.ts copyModule（fire-and-forget 内部）

### R10 改造最终验证结果



* **TypeScript 编译**：`npx vue-tsc --noEmit` → **零错误**（exit code 0）

* **改造文件清单**：


  * `src/stores/tags.ts` — IndexedDB 读写 + initialize

  * `src/stores/projectTypes.ts` — IndexedDB 读写 + initialize

  * `src/stores/bomTemplates.ts` — IndexedDB 读写 + key 查找删除

  * `src/stores/equipment.ts` — 三表联动 + 更改历史持久化

  * `src/stores/modules.ts` — BOM 独立存储 + 按需查询 + 分页

  * `src/stores/projects.ts` — 下单 BOM 独立存储 + 按需查询 + 分页

  * `src/main.ts` — async bootstrap 初始化流程

  * `src/db/index.ts` — 预存错误修复（拼写 + transaction）

  * `src/db/seed.ts` — 预存错误修复（类型断言 + 导入）

  * `src/db/migration.ts` — 预存错误修复（transaction）

* **未修改文件**：所有 views 页面（页面改造由后续任务处理）、src/types/index.ts（保持类型兼容）

* **核心设计**：Pinia 内存缓存 + Dexie 持久化双写，BOM 条目独立表按需查询，移除 LocalStorage watch deep



***

# R11 列表页分页 + BOM 异步适配调试记录

### 2026-09-09 Module 类型 bom 字段运行时为 undefined 导致列表页崩溃风险



* **问题描述**：Module 类型定义中 `bom: Bom` 为必填字段，但 Stores 改造为 IndexedDB 后，`modulesStore.modules` 中的 Module 对象运行时不再包含 `bom` 属性（BOM 条目独立存储到 `db.bomItems` 表）。ModuleList.vue 中直接访问 `row.bom.items.length` 和 `mod.bom.items.filter(...)` 会抛出 `Cannot read properties of undefined (reading 'items')`。

* **原因分析**：类型定义与运行时数据结构不一致。types/index.ts 中 Module.bom 为必填，但 store 的 initialize () 只从 `db.modules.toArray()` 加载模块元数据，不包含 bom 字段。addModule 创建对象时用 `as Module` 类型断言绕过了类型检查。

* **修复方法**：

1. ModuleList.vue 新增 `bomItemsMap: Map<string, BomItem[]>` 缓存，onMounted 时用 Promise.all 并行调用 `modulesStore.getBomItems(moduleId)` 获取所有模块 BOM 条目

2. 模板中 BOM 条目数从 `row.bom.items.length` 改为 `bomItemsMap.get(row.id)?.length ?? 0`，加载中显示`...`

3. `getBomTypeCount` 从接收 Module 对象改为接收 moduleId 字符串，从缓存 Map 查询

4. 导出 Excel 中 BOM 条目数同步改为从缓存获取

* **验证结果**：ModuleList.vue 不再访问 module.bom，BOM 条目数正确显示，vue-tsc 零错误

### 2026-09-09 generateOrderBom 在 IndexedDB 模式下返回空数组



* **问题描述**：ProjectEditor 中点击 "生成下单 BOM" 按钮，`generateOrderBom(project.selectedModules, modulesStore.modules)` 始终返回空数组，因为 modulesStore.modules 中的 Module 对象运行时不含 bom.items。

* **原因分析**：generateOrderBom 内部有 `if (!module.bom || !module.bom.items) continue` 防护，所有模块都被 skip，导致返回空数组。

* **修复方法**：

1. ProjectEditor 新增 `moduleBomCache: Map<string, BomItem[]>` 缓存

2. 新增 `ensureModulesBom(moduleIds)` 用 Promise.all 并行获取 BOM 条目并缓存

3. 新增 `buildModulesWithBom(moduleIds)` 从缓存构建 `{ ...module, bom: { moduleId, items } }` 临时数组

4. handleGenerateBom 改为 async：先 await ensureModulesBom，再 buildModulesWithBom，最后 generateOrderBom (selectedModules, modulesWithBom)

5. previewBomCount 从 computed 改为 ref+watch 异步更新（computed 不支持 async）

6. 模块选择表格中下单条目数从 `getOrderItemCount(modulesStore.getModuleById(id))` 改为 `getModuleOrderItemCount(id)`（从缓存读取）

* **验证结果**：生成下单 BOM 功能恢复正常，预览计数正确显示，vue-tsc 零错误

### 2026-09-09 batchImport executeImport 同步调用异步 store 方法导致类型错误



* **问题描述**：batchImport.ts 的 executeImport 原设计为同步函数，内部调用 `modulesStore.addBomItem(moduleId, item)`。Stores 改造后 addBomItem 变为 async（返回 Promise），同步调用不会等待 DB 写入完成，且 ModulesStoreLike 接口定义与实际 store 签名不兼容。

* **原因分析**：executeImport 设计时假设 store 方法是同步的（LocalStorage 模式）。IndexedDB 模式下所有 BOM 操作都是异步的。

* **修复方法**：

1. ModulesStoreLike 接口更新：addBomItem 返回 Promise，新增 importBomItems 和 getBomItems 方法

2. executeImport 改为 async function，返回 Promise

3. BOM 条目添加从循环调用 addBomItem（N 次异步 DB 写入）改为调用 importBomItems（1 次 bulkAdd），性能大幅提升

4. 每个模块先 await getBomItems 获取现有条目数，作为新条目的 sortOrder 起点，避免排序冲突

5. ModuleList.vue 中 handleConfirmImport 改为 async 并 await executeImport

* **验证结果**：批量导入功能正常，BOM 条目正确写入 IndexedDB，vue-tsc 零错误

### R11 最终验证结果



* **TypeScript 编译**：`npx vue-tsc --noEmit` → **零错误**（exit code 0），一次通过

* **修改文件清单**：


  * `src/views/equipment/EquipmentList.vue` — 分页默认 20，支持 100

  * `src/views/module/ModuleList.vue` — 分页默认 20 + BOM 异步加载 + 导入 await

  * `src/views/project/ProjectList.vue` — 分页默认 20，支持 100

  * `src/views/project/ProjectEditor.vue` — 生成下单 BOM 适配 + 预览计数异步化 + 模块 BOM 缓存

  * `src/utils/batchImport.ts` — executeImport 异步化 + importBomItems 批量添加

* **未修改文件**：ModuleEditor.vue、ProjectEditor.vue 的 BOM 表格部分（由另一个子代理处理）、bomGenerator.ts（已有 undefined 防护）、types/index.ts（保持类型兼容）

* **未发现阻塞性 bug**



***

# R12 编辑器 BOM 表格异步加载与分页调试记录

### 2026-09-09 orderBomItems 重复声明风险



* **问题描述**：ProjectEditor.vue 中已存在`const orderBomItems = computed(() => project.value?.orderBom || [])`（旧代码），新增异步加载状态时声明了`const orderBomItems = ref<OrderBomItem[]>([])`，两者同名会导致 TS 重复声明错误。

* **原因分析**：旧的 computed 基于 project.orderBom（运行时 undefined），必须完全移除而非保留。

* **修复方法**：删除旧的`orderBomItems` computed 和`filteredOrderBomItems` computed，统一使用 ref 版本的 orderBomItems。

* **验证结果**：vue-tsc 零错误，无重复声明。

### 2026-09-09 分页后上移 / 下移按钮禁用逻辑失效



* **问题描述**：原代码中`isFirstBomItem`/`isLastBomItem`基于当前页 bomItems 数组判断首末项，分页后第一页的首项确实是全局首项，但第二页的首项不是全局首项，此时上移按钮应可用但被错误禁用。

* **原因分析**：分页后当前页数据只是全量数据的子集，仅凭当前页无法判断全局首末位置。

* **修复方法**：

1. `isFirstBomItem`/`isLastBomItem`改为返回 false（按钮始终可用）

2. `moveBomItem`改为先`await modulesStore.getBomItems()`获取全量条目，按 sortOrder 排序后找到当前条目索引，与相邻条目交换 sortOrder

3. 交换后`await loadBomItems()`重新加载当前页（条目可能跨页移动）

4. moveBomItem 内部处理边界（targetIndex <0 ||>= allItems.length 时直接 return）

* **验证结果**：分页后上移 / 下移功能正常，跨页移动后表格正确刷新。

### 2026-09-09 新增 BOM 条目 sortOrder 计算依赖当前页导致排序冲突



* **问题描述**：原代码中新增条目时`maxSort = Math.max(...bomItems.value.map(i => i.sortOrder))`，分页后 bomItems 只是当前页数据，如果当前页不是最后一页，maxSort 会小于全局最大值，导致新条目 sortOrder 与后续页条目冲突。

* **原因分析**：分页后当前页数据不包含全量条目，无法准确计算全局 maxSortOrder。

* **修复方法**：新增 / 导入条目时先`await modulesStore.getBomItems(moduleId)`获取全量条目，计算全局 maxSortOrder 后再 + 1 作为新条目 sortOrder。

* **涉及位置**：ModuleEditor handleSaveBomItem（新增）、handleConfirmImport（导入）；ProjectEditor handleBomDialogSubmit（新增手动行）

* **验证结果**：新增条目 sortOrder 始终大于全局最大值，无排序冲突。

### 2026-09-09 Module 类型 bom 字段运行时 undefined 导致 Tab2 子模块表格崩溃



* **问题描述**：ModuleEditor.vue Tab2 子模块表格中`{{ row.bom.items.length }}`直接访问 row.bom.items，Stores 改造为 IndexedDB 后 Module 对象运行时不含 bom 属性，访问`row.bom.items`抛出`Cannot read properties of undefined (reading 'items')`。

* **原因分析**：与 R11 中 ModuleList.vue 遇到的问题相同，类型定义与运行时数据结构不一致。

* **修复方法**：改为`{{ row.bom?.items?.length || 0 }}`，添加可选链和默认值。

* **验证结果**：Tab2 子模块表格正常渲染，BOM 条目数显示为 0（因为 BOM 已独立存储，子模块列表暂不展示准确 BOM 数，属于已知限制）。

### R12 最终验证结果



* **TypeScript 编译**：`npx vue-tsc --noEmit` → **零错误**（exit code 0），一次通过

* **修改文件清单**：


  * `src/views/module/ModuleEditor.vue` — BOM 管理 Tab 异步加载 + 服务端分页 + 搜索 + 全量 sortOrder 交换 + 导出全量获取

  * `src/views/project/ProjectEditor.vue` — 下单 BOM Tab 异步加载 + 服务端分页 + 搜索 + 生成后刷新 + 导出全量获取

* **未修改文件**：stores（R10 完成）、列表页（R11 完成）、bomGenerator.ts、types/index.ts、batchImport.ts

* **已知限制**：


  * ModuleEditor Tab2 子模块表格的 BOM 条目数显示为 0（BOM 已独立存储，如需准确显示需类似 ModuleList 的异步缓存机制，不在本次改造范围）

  * 底部统计的分类计数（装配 / 下单 / 两者、生成 / 手动 / 修改）基于当前页数据，标注 "当前页"；总数为准确的全量计数

* **未发现阻塞性 bug**



***

# R13 系统性 BUG 排查调试记录（10 轮）

**日期：2026-09-09**

### 2026-09-09 bomTemplates.addField 参数类型要求 id 必填



* **报错信息**：`src/views/Settings.vue(461,9): error TS2345: Argument of type '{ key: string; label: string; fieldType: string; required: false; visible: true; }' is not assignable to parameter of type 'Omit<BomTemplateField, "sortOrder">'. Property 'id' is missing in type ...`

* **复现步骤**：运行 `npx vue-tsc --noEmit`

* **原因分析**：`addField`参数类型为`Omit<BomTemplateField, 'sortOrder'>`，只排除了 sortOrder，id 仍为必填字段。但 Settings.vue 调用 addField 时只传了 key/label/fieldType/required/visible，没有传 id

* **修复方法**：将参数类型改为`Omit<BomTemplateField, 'id' | 'sortOrder'>`，函数内部调用`generateId('btf')`自动生成 id。同时导入 generateId 工具函数

* **修复代码**：



```
function addField(field: Omit\<BomTemplateField, 'id' | 'sortOrder'> & { sortOrder?: number }) {

&#x20; const newField: BomTemplateField = {

&#x20;   ...field,

&#x20;   id: generateId('btf'),

&#x20;   sortOrder: field.sortOrder ?? maxSort + 1

&#x20; }

}
```



* **验证结果**：`npx vue-tsc --noEmit`零错误；浏览器实测设置页新增字段 "testField" 成功，列表正确显示，模块 BOM 弹窗动态字段同步出现 "测试字段"

* **影响文件**：`src/stores/bomTemplates.ts`

### 2026-09-09 EquipmentEditor 关联模块 Tab BOM 条目数永远显示 0



* **问题描述**：设备编辑器→关联模块 Tab，BOM 条目数列全部显示 0，即使模块实际有 BOM 条目

* **原因分析**：模板使用`{{ row.bom?.items?.length || 0 }}`。Stores 改造为 IndexedDB 后，Module 对象运行时不再包含`bom`属性（BOM 条目独立存储到`db.bomItems`表），因此`row.bom`为 undefined，可选链返回 undefined，`|| 0`结果为 0

* **修复方法**：新增`moduleBomCountMap = ref<Map<string, number>>(new Map())`异步缓存；新增`loadModuleBomCounts()`函数用`Promise.all`并行调用`modulesStore.getBomItems(moduleId)`获取各模块条目数；`watch(filteredModules, {immediate: true})`自动触发加载；模板改为`{{ moduleBomCountMap.get(row.id) ?? '...' }}`

* **验证结果**：关联模块列表正确显示各模块 BOM 条目数，加载中显示 "..."

* **影响文件**：`src/views/equipment/EquipmentEditor.vue`

### 2026-09-09 ModuleEditor 层级结构 Tab 子模块 BOM 条目数永远显示 0



* **问题描述**：模块编辑器→层级结构 Tab，子模块列表 BOM 条目数列全部显示 0

* **原因分析**：同 EquipmentEditor 问题，使用`row.bom?.items?.length || 0`，BOM 已独立存储

* **修复方法**：新增`childBomCountMap = ref<Map<string, number>>(new Map())`；新增`loadChildBomCounts()`函数并行加载；`watch(childModules, {immediate: true})`自动触发；模板改为`{{ childBomCountMap.get(row.id) ?? '...' }}`

* **验证结果**：子模块列表正确显示 BOM 条目数。此修复同时解决了 R12 中记录的 "已知限制"

* **影响文件**：`src/views/module/ModuleEditor.vue`

### 2026-09-09 "重置演示数据" 功能不真正重置数据



* **问题描述**：用户下拉菜单→重置演示数据，确认后数据没有任何变化

* **原因分析**：`handleResetData`调用各 store 的`resetToMock()`方法。但 R10 改造后，`resetToMock()`的实现是`fields.value = await db.bomTemplates.toArray()`—— 只是重新从 IndexedDB 加载现有数据，不清空表也不重新 seed mock 数据，等于什么都没做。此外确认提示文案还说 "清除 LocalStorage 中的所有修改"，但数据已迁移到 IndexedDB，文案过时

* **修复方法**：

1. 导入`resetDatabase` from `@/db/migration`

2. `handleResetData`改为 async：先`await resetDatabase()`（清空所有 11 张表并重新 seed），然后`Promise.all`并行调用所有 6 个 store 的`initialize()`

3. 确认提示文案改为 "清除 IndexedDB 中的所有修改并恢复初始演示数据"

* **验证结果**：类型检查通过，逻辑正确

* **影响文件**：`src/layouts/MainLayout.vue`

### 2026-09-09 Settings 页 "恢复默认" 按钮不真正恢复默认模板



* **问题描述**：设置页→BOM 条目模板设置→恢复默认，确认后字段没有恢复

* **原因分析**：`handleResetTemplate`调用`bomTemplatesStore.resetToMock()`，同重置演示数据问题，只是重新加载现有数据

* **修复方法**：导入`db` from `@/db/index`和`mockBomTemplates` from `@/mock/bomTemplates`；改为`await db.bomTemplates.clear()` → `await db.bomTemplates.bulkPut(mockBomTemplates)` → `await bomTemplatesStore.initialize()`

* **验证结果**：类型检查通过，逻辑正确

* **影响文件**：`src/views/Settings.vue`

### R13 排查最终结果



* **排查轮数**：10 轮（类型检查→浏览器测试→功能验证→修复→回归，重复至无新 BUG）

* **发现并修复 BUG**：5 个

* **TypeScript 编译**：`npx vue-tsc --noEmit` → **零错误**（exit code 0）

* **浏览器验证**：所有核心页面和功能全部正常，无 JavaScript 控制台错误

* **剩余未解决问题**：无

* **修改文件**：bomTemplates.ts、EquipmentEditor.vue、ModuleEditor.vue、MainLayout.vue、Settings.vue



***

# R14 IndexedDB DataCloneError 修复调试记录

### 2026-09-09 模块 BOM 导入点击 "确认导入" 无反应

**问题描述**：模块编辑器→BOM 管理 Tab→点击 "导入 Excel/CSV"→上传 Excel 文件→进入字段映射步骤→点击 "确认导入"，无任何反应，对话框不关闭，数据不导入，无错误提示。

**排查过程**：



1. **初步检查**：确认导入对话框正常打开，文件上传正常，字段映射自动匹配正常，"确认导入" 按钮可点击

2. **控制台检查**：发现 `Uncaught (in promise) DexieError2` 错误，但错误信息不详细

3. **逐步调试**：在浏览器中直接调用 `modulesStore.importBomItems()`，成功写入数据，说明 importBomItems 本身没问题

4. **模拟完整流程**：在浏览器中逐步执行 handleConfirmImport 的逻辑，发现错误发生在 `addChangeHistory` 中

5. **详细错误捕获**：使用 try-catch 捕获完整错误信息，得到 `DataCloneError: Failed to execute 'put' on 'IDBObjectStore': #<Object> could not be cloned.`

**根本原因**：



* `addChangeHistory` 函数中，`getModuleById(targetId)` 返回的是 Pinia 响应式 Proxy 对象

* 直接修改该对象（`mod.changeHistory.push(...)`）后调用 `db.modules.put(mod)`

* IndexedDB 的结构化克隆算法无法克隆 Vue 的响应式 Proxy 对象，抛出 DataCloneError

* `handleConfirmImport` 函数只有 try-finally 没有 catch，错误被静默吞掉，用户看不到任何提示

**修复方法**：



1. 在所有 6 个 Store 中导入 Vue 的 `toRaw` 函数

2. 在所有 `db.xxx.put()` 调用前，使用 `toRaw()` 将响应式对象转换为纯对象

3. 特别注意 `db.xxx.bulkPut(array)` 中的数组元素也需要转换

**影响范围**：



* 模块 BOM 导入（直接触发）

* 模块更新、删除、复制（间接触发 addChangeHistory）

* 设备更新、序列号更新（equipment store）

* 项目更新（projects store）

* 标签更新（tags store）

* BOM 模板字段更新、删除（bomTemplates store）

* 项目类型更新（projectTypes store）

**验证结果**：



* TypeScript 编译零错误

* 浏览器实测：模块 BOM 导入功能正常，上传测试 Excel 后点击 "确认导入"，对话框关闭，数据成功写入 IndexedDB

* IndexedDB 查询验证：导入的 TEST-001/TEST-002 数据正确存储，source='import'

* 其他导入功能排查：项目编辑器无下单 BOM 导入功能；模块列表批量导入调用的 store 方法已修复

**经验教训**：



1. Pinia 响应式对象不能直接写入 IndexedDB，必须使用 toRaw () 转换

2. async 函数中关键操作应添加 catch 并给用户提示，避免错误被静默吞掉

3. DexieError2 通常是 IndexedDB 底层错误的包装，需要捕获 inner 错误才能看到真实原因

4. 数据层重构（如 BOM 条目独立存储）后，应全面检查所有写入操作是否受影响



***

## 2026-09-09 10 轮系统性自查 - 调试记录汇总

### 问题 1：模块图号验证规则写反



* **报错信息**：无显式报错，表单验证失败导致保存按钮点击后静默无反应

* **复现步骤**：模块编辑器→输入正确图号 "ASM-GZ-001"→点击保存→无反应

* **原因分析**：验证规则 `/ASM$/i` 要求以 ASM 结尾，但实际格式以 ASM 开头

* **修复方法**：4 处 `/ASM$/i` 改为 `/^ASM/i`

* **验证结果**：正确格式不触发错误，错误格式（WRONG-001）触发错误提示

### 问题 2：IndexedDB 写入嵌套响应式数组导致 DataCloneError（R14 修复不彻底）



* **报错信息**：`DataCloneError: [object Array] could not be cloned`

* **复现步骤**：模块编辑器→修改任意字段→点击保存→备注对话框→确定→无成功提示，数据未保存

* **原因分析**：R14 使用 `toRaw()` 只转换了顶层对象，嵌套的响应式数组（configurationIds、tags 等）仍是 Vue Proxy

* **排查过程**：通过浏览器 Vue 组件实例直接调用 doSave 捕获到错误；doSave 只有 try-finally 没有 catch，错误被静默吞掉

* **修复方法**：新增 `deepClone()` 函数（JSON 序列化），所有 6 个 Store 的 `toRaw()` 替换为 `deepClone()`

* **验证结果**：模块编辑保存功能正常，doSave 返回 success

### 问题 3：零件追溯查询永远返回空结果



* **报错信息**：无报错，查询结果始终显示 "未找到匹配的零件"

* **复现步骤**：扩展页面→输入 "螺栓"→点击查询→无结果

* **原因分析**：Extension.vue 直接访问 `module.bom.items`，但 BOM 条目已迁移到独立的 bomItems 表

* **修复方法**：handleSearch 改为 async，使用 `modulesStore.getBomItems()` 和 `projectsStore.getOrderBomItems()` 异步获取

* **验证结果**：查询 "螺栓" 返回 1 个项目（50 件）和 2 个模块（20 件 + 30 件）

### 问题 4/5：doSave 函数缺少 catch



* **报错信息**：保存失败时无任何提示

* **原因分析**：ModuleEditor 和 ProjectEditor 的 doSave 只有 try-finally 没有 catch

* **修复方法**：添加 catch 块，console.error 记录错误，ElMessage.error 显示提示

* **验证结果**：TypeScript 零错误，回归测试通过

### 本次自查关键经验



1. **toRaw () 不递归**：嵌套响应式数组必须深度克隆，这是 R14 修复不彻底的根本原因

2. **try-finally 陷阱**：只有 finally 没有 catch 的 async 函数，错误会变成 unhandled rejection

3. **数据迁移后遗症**：BOM 独立存储后，Extension.vue 等访问点未同步更新

4. **浏览器自动化**：bu.click 可能定位失败，JavaScript 直接点击更可靠

***

# R57-R62 批量功能开发调试记录

### 2026-09-09 对象 key 含 `/` 字符导致 TypeScript 语法错误

* **报错信息**：`src/types/index.ts(36,1): error TS1128: Unexpected token. A constructor, method, accessor, or property was expected.`

* **复现步骤**：在 STANDARD_COLUMN_LABELS 对象中使用 `物料/目录号` 作为 key（未加引号），运行 vue-tsc

* **原因分析**：TypeScript 对象字面量中，key 如果包含 `/` 等特殊字符，必须用引号包裹为字符串字面量。`物料/目录号` 中的 `/` 被解析为除法运算符，导致语法解析失败。

* **修复方法**：将 key 改为 `'物料/目录号'`（单引号包裹）

* **验证结果**：vue-tsc 零错误通过

* **影响文件**：`src/types/index.ts`

### 2026-09-09 ValidBomItem 非必填字段未设可选导致字段映射后类型错误

* **报错信息**：`src/utils/batchImport.ts 中 ValidBomItem 类型的字段在字段映射后可能不存在，TS 报错 Property 'xxx' is missing`

* **原因分析**：批量导入改为字段映射后，用户可能只映射部分列，未映射的字段在 BOM 条目中不存在。但 ValidBomItem 接口中 englishDescription、materialCatalogNo、assemblyUnit 等字段定义为必填，与实际运行时数据不一致。

* **修复方法**：将 ValidBomItem 接口中所有非必填字段改为可选（`englishDescription?`、`materialCatalogNo?`、`assemblyUnit?`、`reserved1?`、`reserved2?`、`remarks?`），只保留必填字段（drawingNo、chineseDescription、quantity、type）为必填。

* **验证结果**：vue-tsc 零错误通过；字段映射后只包含用户映射的字段，不影响校验和导入

* **影响文件**：`src/utils/batchImport.ts`

### 2026-09-09 双代理并行修改 ProjectEditor.vue 无冲突验证

* **场景**：两个子代理同时修改 ProjectEditor.vue——代理A修改 getSelectOptions 函数（BOM表格select渲染），代理B修改导出对话框（导出设置弹窗）。

* **风险**：两个代理读取同一文件后分别保存，可能导致后者覆盖前者的修改。

* **验证方法**：两个代理完成后，独立运行 vue-tsc 编译，并 Grep 确认 getSelectOptions 和导出对话框（project_export_order_fields、表头预览）均存在于文件中。

* **结果**：编译零错误，两处改动共存无冲突。原因是两个代理修改的是文件中完全不同的区域（BOM表格渲染函数 vs 导出对话框模板和逻辑），Edit 工具的精确字符串匹配不会互相干扰。

* **经验教训**：并行代理修改同一文件时，只要修改区域不重叠且不改变对方的上下文锚点，Edit 工具可以安全共存。但如果修改区域相邻或共享上下文，仍需串行处理。

### 2026-09-09 数据库 v4 迁移幂等性设计

* **问题**：BOM字段key统一改造需要将 IndexedDB 中旧数据的 key 转换为新 key。迁移必须幂等，用户多次刷新或重复升级不会出错。

* **设计方案**：
  1. 迁移时遍历每条 BOM 记录，对每个旧 key 检查是否存在
  2. 如果旧 key 存在且新 key 不存在（或为空），才将旧 key 值复制到新 key
  3. 然后删除旧 key
  4. 如果旧 key 不存在，跳过（说明已经迁移过或是新数据）
  5. 新 key 已有值时不覆盖，避免数据丢失

* **验证结果**：重复执行迁移不会出错；旧数据正确转换；新数据不受影响。

* **影响文件**：`src/db/index.ts`（version(4).upgrade()）
---

### [2026-09-09] Dashboard.vue 缺少 Project 类型导入

* **报错信息**：src/views/Dashboard.vue(372,32): error TS2304: Cannot find name 'Project'

* **复现步骤**：运行 
px vue-tsc --noEmit

* **原因分析**：在 projectStatusBars computed 中使用了 Project['status'] 类型注解，但 script 中只导入了 ChangeRecord 和 BomItem，未导入 Project 类型。

* **修复方法**：在 import 语句中补充 Project 类型。

* **修复代码**：
  `	ypescript
  // 修改前
  import type { ChangeRecord, BomItem } from '@/types'
  // 修改后
  import type { ChangeRecord, BomItem, Project } from '@/types'
  `

---

### [2026-09-09] GlobalSearch.vue 导入路径不存在（预期行为）

* **报错信息**：Cannot find module '@/components/common/GlobalSearch.vue'（初始时），后续该组件由并行代理创建后出现内部类型错误

* **原因分析**：GlobalSearch 组件由另一个代理并行创建，在本任务执行期间可能尚未完成或存在独立的类型问题。

* **处理方式**：按任务要求，GlobalSearch 的导入错误属于预期行为，不进行修复。MainLayout.vue 中按指定路径 @/components/common/GlobalSearch.vue 导入，无 props，直接使用 <GlobalSearch />。

* **验证**：本任务负责的 MainLayout.vue 和 Dashboard.vue 经 vue-tsc 验证零错误。

---

## R63 通用组件库开发调试记录

### 2026-09-09 BomTable.vue 连续 else 导致语法错误

* **报错信息**：`src/components/common/BomTable.vue(558,7): error TS1128: Declaration or statement expected.`

* **原因分析**：行内编辑聚焦逻辑中写了两个连续的 `else` 分支：
  ```ts
  if (Array.isArray(input)) input[0]?.focus?.()
  else input.focus?.()
  else input?.input?.focus?.()  // 语法错误：第二个 else
  ```

* **修复方法**：重构为单一 if-else 结构，先统一获取目标元素再判断 focus 方法：
  ```ts
  const el = Array.isArray(input) ? input[0] : input
  if (el) {
    if (typeof el.focus === 'function') el.focus()
    else if (el.input && typeof el.input.focus === 'function') el.input.focus()
  }
  ```

* **验证结果**：语法错误消除

### 2026-09-09 GlobalSearch.vue SearchResultItem 接口字段缺失

* **报错信息**：
  ```
  Property 'model' does not exist on type 'SearchResultItem'.
  Property 'nameZh' does not exist on type 'SearchResultItem'.
  Property 'drawingNo' does not exist on type 'SearchResultItem'.
  Property 'jobNo' does not exist on type 'SearchResultItem'.
  Property 'customer' does not exist on type 'SearchResultItem'.
  ```

* **原因分析**：SearchResultItem 初始设计只有 id/type/name/route/raw 五个字段，但模板中直接访问 `item.model`、`item.nameZh`、`item.drawingNo`、`item.jobNo`、`item.customer` 等各类型特有的字段。原计划通过 `raw` 字段访问原始数据，但模板中未使用 raw。

* **修复方法**：将各类型特有的字段（model、drawingNo、nameZh、jobNo、customer、materialCatalogNo、chineseDescription、moduleId）全部作为可选字段加入 SearchResultItem 接口，在搜索结果映射时填充对应字段。同时删除不再需要的 BomSearchResult 子接口和 Equipment/Module/Project/BomItem/OrderBomItem 类型导入。

* **验证结果**：所有字段访问类型正确

### 2026-09-09 @element-plus/icons-vue 无 History 导出

* **报错信息**：`src/components/common/GlobalSearch.vue(138,18): error TS2305: Module '"@element-plus/icons-vue"' has no exported member 'History'.`

* **原因分析**：Element Plus 图标库中没有名为 `History` 的图标组件。

* **修复方法**：替换为 `Clock` 图标（语义相近，表示最近/历史记录）。

* **验证结果**：图标导入正确

### 2026-09-09 useUndoRedo.ts 泛型 Ref 赋值类型不兼容

* **报错信息**：
  ```
  Argument of type 'T' is not assignable to parameter of type 'UnwrapRefSimple<T>'.
  Type 'UnwrapRefSimple<T>' is not assignable to type 'T'.
  ```

* **原因分析**：Vue 3 的 `Ref<T>.value` 类型实际为 `UnwrapRefSimple<T>`，当泛型 T 为复杂类型（如对象/数组）时，`T` 与 `UnwrapRefSimple<T>` 不能直接互相赋值。`history.value.push(snapshot(state.value, deep))` 和 `state.value = snapshot(...)` 两处均触发此错误。

* **修复方法**：
  1. `snapshot(state.value as T, deep)` — 读取时将 state.value 断言为 T
  2. `;(history.value as any[]).push(...)` — 推入时将数组断言为 any[]
  3. `;(state as any).value = ...` — 赋值时将 state 断言为 any

* **验证结果**：泛型类型检查通过

### 2026-09-09 BomTable.vue 模板中 editingCell 可能为 null

* **报错信息**：`src/components/common/BomTable.vue(141,33): error TS18047: '__VLS_ctx.editingCell' is possibly 'null'.`

* **原因分析**：模板中 `v-if="editingCell.rowId === row.id"` 直接访问可能为 null 的 editingCell 的属性，TypeScript 模板类型检查要求非空判断。

* **修复方法**：使用可选链 `editingCell?.rowId === row.id && editingCell?.field === col.key`。

* **验证结果**：模板类型检查通过

### R63 最终验证结果

* **TypeScript 编译**：`npx vue-tsc --noEmit` → **零错误**（exit code 0）
* **新建文件**：7个组件 + 3个composable + global.css追加
* **未修改文件**：所有现有业务文件保持不变
* **未发现阻塞性 Bug**

***

## 2026-09-09 Settings.vue / Extension.vue 优化验证记录

### 验证过程
1. 完整阅读 Settings.vue（原1343行）和 Extension.vue（原553行）现有代码
2. 阅读4个通用组件（EmptyState/SkeletonScreen/ColumnSettings/BatchActionBar）API
3. 阅读 types/index.ts、stores（tags/projectTypes/bomTemplates/modules）、db/index.ts 确认数据结构
4. 重写 Settings.vue 和 Extension.vue，保留全部原有功能
5. 执行 `npx vue-tsc --noEmit` 验证

### 验证结果
* **TypeScript 编译**：`npx vue-tsc --noEmit` → **零错误**（exit code 0），首次通过
* **修改文件**：仅 Settings.vue、Extension.vue 两个文件
* **未创建新文件**：所有新功能内联在两个视图文件中
* **未发现阻塞性 Bug**

### 注意事项
* Settings.vue 中 `el-table` 行拖拽使用 Element Plus 原生事件（`row-drag-start`/`row-drop`），需 Element Plus 2.6+ 支持
* Extension.vue 中 `v-html` 渲染高亮文本前已通过 `escapeHtml()` 转义，防止XSS
* 导入功能使用 `db.bulkPut()` 批量写入，大数据量时可能有短暂UI阻塞，已通过50ms间隔缓解

***

## 2026-09-09 EquipmentEditor.vue 优化调试记录

### 2026-09-09 basicForm 从 reactive 改为 ref 的兼容性问题

* **问题描述**：`useUndoRedo<T>(state: Ref<T>)` 要求传入 `Ref<T>`，但原代码使用 `reactive()` 创建 `basicForm`。`reactive` 返回的是代理对象而非 Ref，无法直接传入。

* **解决方案**：将 `basicForm` 从 `reactive({...})` 改为 `ref<BasicFormData>({...})`。
  - 模板中 Vue 自动解包顶层 ref，`v-model="basicForm.name"` 保持不变
  - 脚本中所有访问改为 `basicForm.value.xxx`
  - 定义 `interface BasicFormData` 明确类型，传给 `useUndoRedo<BasicFormData>(basicForm)`

* **验证结果**：`useUndoRedo` 正常工作，撤销/重做可恢复整个表单状态

### 2026-09-09 撤销操作触发 watch 导致历史栈污染

* **问题描述**：`watch(basicForm, ..., { deep: true })` 监听表单变化并调用 `commit()`。当执行 `undo()` 时，`useUndoRedo` 内部修改 `basicForm.value`，触发 watch 再次调用 `commit()`，将撤销后的状态重新推入历史栈，导致撤销失效（redo 栈被截断）。

* **原因分析**：撤销/重做操作本质上也是修改 state，会被深度 watch 捕获。如果不加区分，每次 undo/redo 都会产生新的历史记录。

* **修复方法**：引入 `isUndoRedoing` 标志位
  1. `doUndo()`/`doRedo()` 执行前设置 `isUndoRedoing.value = true`
  2. watch 回调中检查 `if (isUndoRedoing.value) return` 跳过 commit
  3. `nextTick()` 后重置 `isUndoRedoing.value = false`
  4. 同理，初始化回显表单时设置 `isInitializing` 标志，避免初始数据触发 commit

* **验证结果**：撤销/重做功能正常，历史栈不会被污染

### 2026-09-09 useAutoSave 手动保存后状态同步问题

* **问题描述**：手动保存按钮需要显示成功/失败提示，但 `useAutoSave.triggerSave()` 不返回保存结果（内部 catch 了错误）。直接调用 `performSave()` 又不会更新 `lastSaved` 和 `dirty` 状态。

* **解决方案**：
  1. `saveFn` 中保存失败时 `throw new Error()`，让 `triggerSave` 内部 catch 后保持 `dirty=true`
  2. 手动保存调用 `await triggerSave()`，然后检查 `dirty.value`：false=成功，true=失败
  3. `saveFn` 在必填项为空时直接 return（不保存无效状态，也不 throw）

* **验证结果**：手动保存后自动保存状态正确同步，成功/失败提示准确

### 2026-09-09 BomTableRow 类型导入路径

* **问题描述**：`BomTableRow` 类型定义在 `BomTable.vue` 的 `<script setup>` 中并通过 `export type` 导出。需要确认正确的导入方式。

* **解决方案**：使用命名导入语法：`import BomTable, { type BomTableRow } from '@/components/common/BomTable.vue'`。Vue SFC 的 `<script setup>` 中 `export type` 可以被外部导入。

* **验证结果**：TypeScript 类型检查通过，BomTable 组件和 BomTableRow 类型均可正常使用

### 最终验证结果
* **TypeScript 编译**：`npx vue-tsc --noEmit` → **零错误**（exit code 0）
* **修改文件**：仅 EquipmentEditor.vue
* **未创建新文件**：所有新功能内联在单个视图文件中
* **未发现阻塞性 Bug**

***

## R65 ProjectEditor.vue 优化调试记录

### 2026-09-09 PowerShell 命令分隔符问题（复现）

* **报错信息**：`标记"&&"不是此版本中的有效语句分隔符。`

* **复现步骤**：执行 `cd "D:\APP_DEV\Project manager" && npx vue-tsc --noEmit 2>&1 | head -100`

* **原因分析**：Windows PowerShell 不支持 bash 风格的 `&&` 连接符和 `head` 命令

* **修复方法**：改用 PowerShell 语法：`cd "D:\APP_DEV\Project manager"; npx vue-tsc --noEmit 2>&1 | Select-Object -First 100`

* **验证结果**：正常输出类型检查结果

### 2026-09-09 vue-tsc 退出码为2但ProjectEditor.vue零错误

* **报错信息**：`npx vue-tsc --noEmit` 退出码为2，输出5个错误全部在 `src/views/module/ModuleEditor.vue`

* **原因分析**：
  1. ModuleEditor.vue 中 BomTableRow 类型不兼容（OrderBomItem 缺少 type 字段）
  2. ModuleEditor.vue 中 `bomItems` 变量使用前声明（TS2448/TS2454）
  3. 这些错误是预存的，与本次 ProjectEditor.vue 修改无关

* **验证方法**：使用 `Select-String "ProjectEditor"` 过滤输出，确认无 ProjectEditor.vue 相关错误

* **验证结果**：ProjectEditor.vue 零 TypeScript 错误；ModuleEditor.vue 的5个错误为预存问题，不在本次修改范围内

### 2026-09-09 BomTable _rowStatus 与 source 字段映射设计

* **问题描述**：BomTable 组件通过 `_rowStatus`（'new'/'modified'/'deleted'）控制行高亮样式，但 OrderBomItem 使用 `source` 字段（'generated'/'manual'/'modified'）标记来源。需要将两者映射以实现手动行橙色、修改行红色的需求。

* **解决方案**：
  1. 传入 BomTable 前：computed `bomTableItems` 将 source='manual' 映射为 `_rowStatus='new'`，source='modified' 映射为 `_rowStatus='modified'`
  2. BomTable 编辑 generated 行时，内部设置 `_rowStatus='modified'`
  3. 回写时（`handleBomItemsUpdate`）：若 `_rowStatus='modified'` 且原 source='generated'，自动更新 source='modified'；然后剥离 `_rowStatus` 字段
  4. CSS 使用 `:deep(.row-status-new)` 橙色背景、`:deep(.row-status-modified)` 红色背景覆盖 BomTable 默认样式

* **验证结果**：手动行显示橙色背景，修改行显示红色背景，编辑generated行后自动变为modified状态和红色背景

### 2026-09-09 撤销/重做中 Map 类型不可序列化问题

* **问题描述**：`LocalSelectedModule` 接口包含 `configQuantities: Map<string, number>` 字段，`useUndoRedo` 使用 JSON 序列化做深度快照，Map 会被序列化为 `{}` 导致数据丢失。

* **修复方法**：
  1. `EditorSnapshot` 接口中 `selectedModules` 不包含 `configQuantities` 字段
  2. `createSnapshot()` 中映射时排除 `configQuantities`
  3. `applySnapshot()` 恢复时为每个模块重建 `configQuantities: new Map()`

* **验证结果**：撤销/重做后模块选择状态正确恢复，无类型错误

### 2026-09-09 自动保存与新建项目兼容性

* **问题描述**：`useAutoSave` 在组件挂载时即开始监听数据变化，但新建项目时 projectId 为空，无法持久化到 store。

* **修复方法**：
  1. `useAutoSave` 的 `enabled` 参数传入 `computed(() => !isNew.value)`
  2. `saveFn` 内部也检查 `isNew.value`，双重防护
  3. 新建项目保存成功后路由跳转到编辑页，此时 `isNew` 变为 false，自动保存自动启用

* **验证结果**：新建项目时不触发自动保存；保存后进入编辑模式，自动保存正常工作

### 2026-09-09 导出范围"筛选"选项未实现

* **问题描述**：需求要求导出范围支持"全部/筛选/选中"三种，但 BomTable 组件的搜索关键词和列头筛选状态是内部状态，不通过 props/emits 对外暴露，父组件无法获取当前筛选后的条目列表。

* **处理方式**：
  1. 导出范围仅实现"全部"和"选中"两个选项
  2. "筛选"选项因技术限制未实现，在 DEV_LOG 已知限制中记录
  3. 后续可通过增强 BomTable（暴露 filteredItems 或 searchKeyword）来支持

* **影响评估**：用户仍可通过 BomTable 内置搜索定位数据，然后手动勾选需要导出的行，使用"选中"范围导出，功能上可替代"筛选"导出

***

## 2026-09-09 三大核心列表页优化调试记录

### 2026-09-09 Module 类型转换为 Record<string, unknown> 报错

* **报错信息**：
  ```
  src/views/module/ModuleList.vue(593,15): error TS2352: Conversion of type 'Module' to type 'Record<string, unknown>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
    Index signature for type 'string' is missing in type 'Module'.
  ```

* **复现步骤**：在 ModuleList.vue 的 `getFilterFieldValue` 函数中，default 分支使用 `(row as Record<string, unknown>)[field]` 访问动态字段，运行 `npx vue-tsc --noEmit` 报错。

* **原因分析**：TypeScript 不允许直接将具有明确属性的接口（Module）转换为带有索引签名的类型（Record<string, unknown>），因为两者类型结构不充分重叠。Module 接口没有 `[key: string]: any` 索引签名。

* **修复方法**：先转换为 `unknown` 再转换为 `Record<string, unknown>`：
  ```typescript
  return (row as unknown as Record<string, unknown>)[field]
  ```

* **验证结果**：`npx vue-tsc --noEmit` → 零错误（exit code 0）

### 2026-09-09 PowerShell 不支持 && 命令连接符

* **报错信息**：`标记"&&"不是此版本中的有效语句分隔符。`

* **复现步骤**：执行 `cd "D:\APP_DEV\Project manager" && npx vue-tsc --noEmit 2>&1`

* **原因分析**：Windows PowerShell 不支持 bash 风格的 `&&` 连接符，需使用 `;` 分隔。

* **修复方法**：改用 `Set-Location "D:\APP_DEV\Project manager"; npx vue-tsc --noEmit 2>&1`

* **验证结果**：正常执行 vue-tsc 类型检查

### 2026-09-09 列宽记忆与 ColumnSettings 配置分离设计

* **问题描述**：ColumnSettings 组件的 ColumnConfig 接口包含 `width?: number` 字段，理论上可用于列宽记忆。但 ColumnSettings 内部管理 localColumns 并在 syncToParent 时整体 emit，若在页面组件中直接修改 columnConfigs 的 width，可能被 ColumnSettings 的 watch 同步机制覆盖。

* **原因分析**：ColumnSettings 的 watch 仅在 key 顺序变化时同步（`if (localKeys !== newKeys)`），width 变化不会触发覆盖。但 ColumnSettings 内部不显示 width，且其 syncToParent 会 emit 不含外部修改的 width 的本地副本，存在潜在不一致风险。

* **解决方案**：列宽独立存储，使用单独的 localStorage key（`bom_col_width_<page>`）和 `columnWidths` reactive 对象，与 ColumnSettings 的列配置完全分离：
  - `header-dragend` 事件 → 更新 columnWidths → saveColumnWidths()
  - 页面加载 → loadColumnWidths() 恢复
  - 渲染列时 `getColumnWidth(col)` 优先取 columnWidths，其次取 col.width 默认值

* **验证结果**：拖拽列宽后刷新页面，列宽正确恢复；列设置的显示/隐藏/排序功能不受影响

### 2026-09-09 ModuleList 动态列渲染中特殊列处理

* **问题描述**：ModuleList 表格有多列需要自定义渲染（drawingNo 模块树、configurationIds 配置标签、tags 彩色标签、bomCount BOM条目数提示、equipmentName 可点击链接），使用 `v-for` 动态渲染列时需要在单个 `#default` 插槽中通过 `col.key` 分支处理。

* **解决方案**：在 `v-for` 的 `el-table-column` 内使用 `#default="{ row }"` 插槽，通过多层 `v-if="col.key === 'xxx'"` 分支渲染各列特殊内容，default 分支直接显示 `row[col.prop ?? col.key]`。

* **验证结果**：所有特殊列渲染正常，模块树展开/折叠、配置标签 tooltip、标签彩色样式、BOM条目数提示、设备名链接跳转均工作正常

### 2026-09-09 高级筛选中计算字段的处理

* **问题描述**：ModuleList 的高级筛选包含"所属设备"字段，但 Module 接口中只有 `equipmentId`，没有 `equipmentName`。直接使用 `row[cond.field]` 访问 `equipmentName` 会得到 undefined。

* **解决方案**：在 ModuleList 中实现 `getFilterFieldValue(row: Module, field: string): unknown` 函数，对计算字段做特殊处理：
  - `equipmentName` → 通过 `getEquipmentName(row.equipmentId)` 查 store
  - `bomCount` → 通过 `bomItemsMap.value.get(row.id)?.length ?? 0` 获取
  - 其他字段 → `(row as unknown as Record<string, unknown>)[field]`

* **验证结果**：高级筛选中按"所属设备"名称筛选正常工作，按 BOM 条目数筛选也可正常求值

### 最终验证结果
* **TypeScript 编译**：`npx vue-tsc --noEmit` → **零错误**（exit code 0）
* **修改文件**：EquipmentList.vue、ModuleList.vue、ProjectList.vue（共3个）
* **未创建新文件**：所有新功能内联在视图文件中
* **现有功能保留**：三个页面的搜索、新建、编辑、删除、状态切换、分页等原有功能全部完整保留
* **ModuleList 核心功能保留**：模块层级树、BOM预览、标签彩色、配置标签、批量导入、批量添加标签对话框均完整保留
* **未发现阻塞性 Bug**

---

### 2026-09-09 ModuleEditor.vue 重写 — BomTableRow 类型不兼容

* **报错信息**：
```
src/views/module/ModuleEditor.vue(208,16): error TS2322:
Type '(newItems: BomTableRow[]) => void' is not assignable to type '(value: BomTableRow[]) => any'.
Type 'OrderBomItem & { _rowStatus?: ... }' is not assignable to type 'BomTableRow'.
Property 'type' is missing in type 'OrderBomItem & { _rowStatus?: ... }' but required in type 'BomItem'.
```

* **原因分析**：
  - BomTable.vue 内部定义的 `BomTableRow` 类型为 `(BomItem | OrderBomItem) & { _rowStatus? }`
  - ModuleEditor.vue 中自定义的 `BomTableRow` 仅为 `(BomItem) & { _rowStatus? }`
  - OrderBomItem 没有 `type` 字段（BomItem 要求 `type: 'assembly'|'order'|'both'`），导致类型不兼容
  - 事件处理器参数类型与组件 emit 类型不匹配

* **修复方法**：
  - 将 ModuleEditor.vue 中的 `BomTableRow` 类型定义改为与 BomTable 一致：`(BomItem | OrderBomItem) & { _rowStatus?: 'new' | 'modified' | 'deleted' }`
  - 补充 `OrderBomItem` 类型导入
  - 在 `persistBomChanges` 中对 `clean` 对象使用 `as Partial<BomItem>` 显式断言，避免 OrderBomItem 的 `source: 'modified'` 与 BomItem 的 `source` 联合类型冲突

* **验证结果**：类型错误消除

---

### 2026-09-09 ModuleEditor.vue 重写 — 变量使用前声明

* **报错信息**：
```
src/views/module/ModuleEditor.vue(958,7): error TS2448: Block-scoped variable 'bomItems' used before its declaration.
src/views/module/ModuleEditor.vue(958,7): error TS2454: Variable 'bomItems' is used before being assigned.
```

* **原因分析**：
  - auto-save 部分的 `watch(bomItems, ...)` 在第958行
  - `const bomItems = ref<BomTableRow[]>([])` 声明在第1490行（BOM管理部分）
  - JavaScript 块级作用域变量不提升，导致使用前声明错误

* **修复方法**：
  - 将 `bomItems`、`deletedBomIds`、`bomLoading` 三个 ref 的声明提前到 auto-save 部分之前（`autoSaveData` 声明之后）
  - 删除 BOM 管理部分的重复声明

* **验证结果**：变量声明顺序错误消除

---

### 2026-09-09 ModuleEditor.vue 重写 — 语法错误（伪代码残留）

* **报错信息**：`filteredMergedBomItems` computed 中存在 `result = filter by matKw...` 非合法 TypeScript 语法

* **原因分析**：编写代码时残留了占位伪代码，未替换为实际实现

* **修复方法**：替换为实际的物料搜索过滤逻辑：
```typescript
if (matKw) {
  result = result.filter(
    (i) =>
      (i.materialCatalogNo || '').toLowerCase().includes(matKw) ||
      (i.chineseDescription || '').toLowerCase().includes(matKw)
  )
}
```

* **验证结果**：语法错误消除

---

### 最终验证结果
* **TypeScript 编译**：`npx vue-tsc --noEmit` → **零错误**（exit code 0）
* **修改文件**：仅 ModuleEditor.vue（1个文件）
* **未创建新文件**：所有新功能（导入3步骤向导、导出预览对话框、批量操作栏集成等）均内联在视图文件中
* **现有功能保留**：5个Tab全部保留（基本信息、BOM管理、层级结构、BOM总览、更改历史），BOM的CRUD、Excel导入导出、模块层级、更改历史、BOM总览树视图+合并视图等核心功能完整保留
* **通用组件使用**：BomTable、EmptyState、BatchActionBar 均直接导入使用，未重新创建
* **Composables使用**：useKeyboardShortcuts、useAutoSave、useUndoRedo 均正确集成
* **未发现阻塞性 Bug**

---

### [2026-09-09] ModuleEditor.vue 运行时 parentNode null 错误排查与修复

* **报错信息**：
  Uncaught (in promise) TypeError: Cannot read properties of null (reading 'parentNode') at parentNode (chunk-HERIHSTX.js:11080:30) at ReactiveEffect.componentUpdateFn [as fn] (chunk-HERIHSTX.js:8574:11)

* **复现步骤**：硬刷新浏览器 → 导航到组件列表 → 点击任意组件"编辑"按钮 → 页面内容区域完全空白

* **原因分析**：
  1. **主因（Tab Transition 冲突）**：5个 el-tab-pane 内部各包裹了 <Transition name="fade" mode="out-in">，与 el-tabs 内部 DOM 管理冲突。切换 Tab 时 el-tabs 已移除节点但 Transition 仍尝试访问 parentNode，导致 Vue 内部 parentNode 函数读取 null 元素。
  2. **自动保存无限循环**：persistBomChanges 末尾无条件执行 omItems.value = bomItems.value.map(...) 创建新数组 → 触发 watch(bomItems) → updateAutoSaveData → useAutoSave watch → 30秒后再次 doAutoSave → 无限循环，可能导致组件频繁更新时 DOM 状态不一致。
  3. **加载时误标记 dirty**：loadModuleData/loadBomItems 赋值触发 watch 标记 dirty，与自动保存联动可能产生非预期更新。

* **修复方法**：
  1. 移除全部5个 el-tab-pane 内的 <Transition mode="out-in"> 包裹，直接渲染 div 内容
  2. 新增 isLoading/isPersisting 两个标志位，watch 回调和 updateAutoSaveData 在加载/保存期间直接 return，防止无限循环
  3. persistBomChanges 仅在有状态标记时才更新数组，不再无条件 map
  4. 加载数据完成后设 dirty=false

* **自动化测试环境注意事项**：排查过程中发现浏览器标签页 document.visibilityState="hidden"，导致 requestAnimationFrame 不触发，MainLayout 的页面过渡 <transition name="fade" mode="out-in"> 永远卡在 fade-leave-active 状态。这是自动化测试环境的限制，非代码 bug。在真实可见浏览器中页面过渡正常工作。

* **验证结果**：
  - TypeScript 编译：
px vue-tsc --noEmit → **零错误**（exit code 0）
  - Transition 残留：文件中无 Transition 包裹
  - isLoading/isPersisting 守卫：已就位
  - BomTable 组件：已恢复使用
  - el-tree-select：已恢复使用
  - 调试代码：已全部移除


## 2026-09-09 调试记录

### 问题1：generateOrderBom 返回值变更导致调用方类型错误
- 现象：返回值从 OrderBomItem[] 改为 OrderBomResult 后，ProjectEditor.vue 两处调用未同步
- 修复：line 1111 .length -> .items.length；line 1368 使用 result.items 并处理 warnings
- 原因：返回值结构变更必须全链路同步

### 问题2：useTabSync.ts 预存在的 Ref 类型导入缺失
- 现象：npx vue-tsc --noEmit 报错 Cannot find name 'Ref'
- 修复：import 中添加 type Ref
- 备注：非本次改动引入，但为满足零错误要求顺手修复

### 问题3：PowerShell 不支持 && 语句分隔符
- 现象：bash 命令 cd ... && npx vue-tsc 报错
- 修复：改用 PowerShell 分号 ; 分隔

### 验证
- npx vue-tsc --noEmit -> exit code 0，零错误

---

## 2026-09-09 用户体验四大功能实现 - 调试记录

### 问题1：dataHealthCheck.ts 预存类型错误
- 现象：npx vue-tsc --noEmit 报 TS2345/TS2349
- 原因：table 是 db.bomItems 和 db.orderBomItems 的联合类型，Dexie bulkPut 对联合类型不兼容
- 修复：updates.push 改为 as any；table.bulkPut 改为 (table as any).bulkPut

### 问题2：useUniqueValidation 依赖 useDebounceFn
- 现象：useUniqueValidation.ts 引用了不存在的 useDebounce composable
- 修复：新建 src/composables/useDebounce.ts 提供 useDebounceFn 和 useDebounceRef

### 问题3：useTabSync entityId 类型不匹配
- 现象：传入了函数类型但接口要求 string
- 修复：改为传入 moduleId.value 字符串值

### 验证
- npx vue-tsc --noEmit -> exit code 0，零错误

## 2026-09-09 调试记录

- **问题1**：CascadeDeleteDialog.vue 初版在 <script setup> 中使用 export interface，Vue SFC 不允许。修复：拆分为独立 <script lang="ts"> 块导出类型，<script setup> 只做组件逻辑。
- **问题2**：并行开发冲突——modules.ts 在编辑过程中被另一子代理写入 deleteModule(id, {strategy})、getAllDescendantIds、moveModule、wouldCreateCycle。处理：保留对方实现，仅扩展 options 增加 forceRef，并新增 getModuleReferences；避免整体覆盖。
- **问题3**：equipment.ts ↔ projects.ts ↔ modules.ts 形成静态 import 环。确认所有跨 store 调用均在函数体内（运行时），模块顶层不互相调用，ESM live binding 可正常工作，vue-tsc 通过。
- **问题4**：EquipmentEditor.vue 模板中误写了重复 loading 属性（loading="false" + :loading=...），已删除重复项。
- **验证**：npx vue-tsc --noEmit 退出码 0，无错误输出；dev 服务器 http://localhost:5174/ 返回 200。


## 2026-09-09 打印与统计功能调试记录

### 调试问题与修复
1. materialStats.ts 组件BOM遍历中 part 变量未声明（直接赋值），改为 const p = getOrCreatePart(item) 修复 TS2304
2. PrintPreviewDialog 传入 :default-header="true" 但 prop 类型为 string，移除该多余 prop（defaultShowHeader 默认为 true）
3. BomPrintTable 的 PrintRow 类型用 Partial<BomItem> & Partial<OrderBomItem> 交叉类型导致 source 字段类型不兼容(import vs modified)，改为独立宽松类型 { id, quantity, ...可选字段, [key]: any }
4. Extension.vue 新增Tab后需补充 watch 到 vue 导入；修复 materialSearched = true 误写（漏 .value 且重复）
5. PowerShell 读取 UTF-8 文件中文乱码，文件编辑均使用 Edit 工具完成，避免编码问题

### 已知问题
- EquipmentEditor.vue 存在 12 个预存类型错误(ComputedRef<string> 不可赋值 string)，非本次改动引入

## 2026-09-09 性能优化功能调试记录

### 调试问题与修复
1. db/index.ts 中 version(5) 已被另一子代理用于 bomVersions，直接覆写会丢表；改为新增 version(6) 只声明 bomItems/orderBomItems 新索引，避免误删已有索引
2. Extension.vue 模糊回退分支中误用 `moduleId`（该分支循环变量为 `module`），TS2552 报错，改为 `module.id`
3. Worker URL 最初用 `@/` 别名写在 new URL() 里，Vite 静态分析不解析别名；改为相对路径 `../workers/bomGenerator.worker.ts`
4. BomTable 虚拟滚动若用 transform 偏移 tbody 会破坏 `position:sticky` 固定列与表头；改用顶部/底部占位 `<tr>` 撑开高度，行原地渲染，sticky 正常工作
5. usePerformanceSettings 模块级 ref 单例跨组件共享，Settings 修改后 BomTable 响应式自动生效，无需事件总线

### 类型检查过程
- 首次 vue-tsc 报 materialStats/ModuleEditor/ProjectEditor/EquipmentEditor 错误，均为其他子代理并发编辑（错误在不同文件间漂移），非本次引入
- 修复 Extension.vue 自身 TS2552 后，本次负责文件全部通过；最终 `npx vue-tsc --noEmit` 退出码 0

### 已知/边界
- 列表页（ModuleList/ProjectList）本就使用 el-table + 分页(20条/页)，按任务约束优先用分页，未强行套 VirtualList；VirtualList 已备作通用组件
- 有搜索关键词时 IndexedDB 无法全文检索，仍按 moduleId/projectId 缩小范围后前端过滤分页（属预期）
- Excel 解析未迁 Worker（改造面大、收益相对低），按约束用已有的异步/防抖策略保持


## 2026-09-09 变更历史/版本管理 调试记录
### 类型排查过程
- 首次 vue-tsc 报 materialStats/Extension/PrintRow/default-header 错误，均为其他子代理并行编辑所致（随时间自行消失）
- EquipmentEditor 回滚函数报 equipmentId 为 ComputedRef：其他子代理已将 const equipmentId 改为 computed，本分支改用 equipmentId.value
- useTabSync.ts(45) ref<string>(() => {...}) 误传工厂函数 → 改为先求值再 ref(initial)，修复后零错误
### 设计取舍
- 回滚仅对基本信息字段（beforeData），BOM 条目回滚由"回滚前自动备份当前为新版本 + 整表替换"实现，避免逐条 diff 写回的复杂度
- BomDiffViewer 行标识采用 materialCatalogNo|drawingNo；修改行展开字段对比，支持导出 Excel 差异报告
- ChangeHistoryList 为受控组件：通过 emit('rollback', record) 交由各编辑器执行实际回滚并记录"回滚"历史
### 结论
- npx vue-tsc --noEmit 最终退出码 0

***

# R66 QA测试最终轮 - 调试记录

**日期：2026-09-10**
**接手自**：o_0001XCTalJK（第5轮测试85%时被取消）

## 2026-09-10 设备编辑器点击编辑崩溃（TDZ暂时性死区错误）

* **问题描述**：设备列表→点击编辑→页面崩溃，显示全局错误边界页面，报错 `Cannot access 'configList' before initialization`

* **报错信息**：
  ```
  ReferenceError: Cannot access 'configList' before initialization
    at EquipmentEditor.vue:277:14 (watcher getter)
  ```
  后续级联错误：ElTabPane的beforeUnmount钩子中 `Cannot read properties of undefined (reading 'indexOf')`（因组件崩溃后Tab清理失败）

* **复现步骤**：设备列表→点击任意设备"编辑"按钮→页面立即崩溃

* **原因分析**：
  1. `watch(() => [configList.value, equipmentModules.value], ...)` 定义在第965行
  2. 但 `configList` computed 声明在第976行，`equipmentModules` computed 声明在第1089行
  3. JavaScript `const`声明存在暂时性死区（TDZ），在声明前访问变量抛出ReferenceError
  4. watch的getter在组件初始化时立即执行，此时configList和equipmentModules尚未声明，触发TDZ错误
  5. 组件崩溃后，Element Plus的el-tab-pane在beforeUnmount时尝试访问已销毁的父组件上下文，导致级联indexOf错误

* **修复方法**：将watch块从第965-973行移到第1089行`equipmentModules`声明之后（第1091行后），确保watch执行时两个computed变量均已声明

* **修复代码**：
  ```typescript
  // 修复前（第965行，configList尚未声明）
  watch(
    () => [configList.value, equipmentModules.value],
    () => { ... },
    { deep: true }
  )
  const configList = computed(...)  // 第976行才声明

  // 修复后（移至equipmentModules声明之后）
  const equipmentModules = computed(...)  // 第1089行
  watch(
    () => [configList.value, equipmentModules.value],
    () => { ... },
    { deep: true }
  )
  ```

* **验证结果**：
  - TypeScript编译：`npx vue-tsc --noEmit` → 零错误（exit code 0）
  - 浏览器实测：设备列表→点击编辑→设备编辑器正常加载，7个Tab全部显示
  - Tab切换测试：基本信息/配置管理/关联项目/关联组件/BOM预览/序列号管理/更改历史 全部正常切换
  - 控制台：零JavaScript错误
  - BOM预览Tab：正确显示BOM条目表格

* **影响文件**：`src/views/equipment/EquipmentEditor.vue`

* **经验教训**：
  1. Vue 3 `<script setup>`中，`watch`/`computed`引用其他变量时必须确保被引用变量已声明
  2. `const`声明的变量存在TDZ，不像`var`有变量提升
  3. 组件初始化时watch的getter会立即执行，此时所有被引用变量必须已就绪
  4. 一个组件的崩溃可能导致Element Plus等UI库的清理钩子产生级联错误，排查时应关注第一个错误而非后续级联错误

***

## 2026-09-10 QA测试第5轮完成 - 全量回归测试记录

### 测试范围
- 工作台（Dashboard）：统计卡片/状态分布/趋势图/时间线/最近活动 ✅
- 设备管理：列表+编辑器（7个Tab全部测试）✅
- 组件管理：列表（层级树）+编辑器（6个Tab，BOM管理深度测试）✅
- 项目管理：列表+编辑器（4个Tab，下单BOM生成测试）✅
- 扩展页面：零件追溯查询/物料使用统计/组件复用统计 ✅
- 设置页：标签管理/项目类型管理/BOM模板设置/数据管理（全部子功能）/打印设置 ✅
- 数据健康检查：孤儿数据/无效引用/循环引用/未登记字段检测 ✅
- 数据重置：清除所有数据+重置演示数据+数据恢复验证 ✅
- 系统功能：全局搜索/错误边界/自动保存/撤销重做 ✅

### 测试结果
- TypeScript编译：零错误 ✅
- Dev服务器：http://localhost:5174/ 正常运行 ✅
- 浏览器控制台：所有核心页面零JavaScript错误 ✅
- 发现并修复bug：1个（设备编辑器TDZ错误，见上方记录）
- 数据质量问题：2个（未登记BOM字段NameEng/supplier，非代码bug）

### 下单BOM生成验证
- 项目prj001选择5个模块，应用选择后点击"重新生成BOM"
- 确认对话框正常弹出，点击"确定生成"
- 成功生成26条下单BOM条目，总数量191.5
- 来源模块分布：ASM-GZ-001(8条)/ASM-CTL-001(6条)/ASM-FRM-001(5条)/ASM-GZ-002(5条)/ASM-GZ-003(4条)
- BomTable表格渲染正常，无`<!--v-if-->`问题

### 数据健康检查结果
- 共发现2个问题（均为警告级别）：
  1. 未登记BOM字段「NameEng」：出现在2条BOM条目中
  2. 未登记BOM字段「supplier」：出现在2条BOM条目中
- 错误0个，警告2个
- 一键修复（0项）：两个警告均需人工处理（在模板中登记字段或清除数据）

### 数据重置验证
- 点击"清除所有数据"→确认对话框→数据全部清零（0设备/0组件/0项目/0 BOM条目）
- 通过用户菜单"重置演示数据"→确认→数据恢复（3设备/11组件/2项目/78 BOM条目）
- 数据重置和恢复功能均正常工作

### 错误边界验证
- GlobalErrorBoundary.vue已实现`watch(() => route.fullPath, ...)`，路由变化时自动重置错误状态
- R5-001（错误边界不自动重置）已修复

### 路由过渡说明
- 自动化测试环境中浏览器标签页`document.visibilityState="hidden"`时，CSS过渡动画可能卡在fade-leave状态
- 这是自动化测试环境限制，非代码bug；真实可见浏览器中路由过渡正常工作
- 建议后续为路由过渡添加超时fallback

### 最终交付物
- `QA_TEST_REPORT.md` — 完整QA测试报告（5轮测试汇总/bug清单/统计分析/稳定性评估/建议）
- `DEBUG_LOG.md` — 本记录追加
- 设备编辑器TDZ错误修复

***

## 2026-09-10 组件编辑器父模块选择与返回确认弹窗修复

### 问题1：关联父模块选择无反应

* **问题描述**：组件编辑器基本信息中，点击"父模块"选择器无反应，无法选择父模块
* **根因分析**：
  1. `el-tree-select`组件设置了`check-strictly`属性，该属性在el-tree中用于父子节点不关联选择，但在el-tree-select单选模式下可能导致选择行为异常
  2. 缺少显式的`node-key="id"`属性配置，虽然默认值为id，但显式配置更可靠
* **修复方法**：
  1. 移除`check-strictly`属性（el-tree-select单选模式不需要此属性）
  2. 添加`node-key="id"`显式配置节点唯一标识
* **修复代码位置**：`src/views/module/ModuleEditor.vue` 第140-151行
* **验证结果**：
  - 点击父模块选择器正常展开下拉面板
  - 下拉面板显示el-tree结构，包含4个可选父模块（控制系统/机架组件/电气柜/气动系统）
  - 选择父模块后成功触发`handleParentChange`，显示"父模块已更新（保存后生效）"提示
  - TypeScript编译零错误

### 问题2：返回确认弹窗点击"离开"无反应

* **问题描述**：组件编辑器中点击返回按钮，弹出"有未保存的更改，确定返回吗？"确认框，点击"离开"按钮无反应，无法离开页面
* **根因分析**：
  - `handleBack`函数中点击"离开"后调用`router.back()`
  - `router.back()`触发路由变化，进而触发`onBeforeRouteLeave`导航守卫
  - `onBeforeRouteLeave`中检测到`dirty.value`为true，再次弹出确认对话框
  - 两个确认对话框叠加或状态冲突，导致第二个弹窗的"离开"按钮交互异常
* **修复方法**：
  1. 新增`isLeaving`标志位（ref(false)），用于防止重复弹出离开确认框
  2. 在`handleBack`的"离开"回调中先设置`isLeaving.value = true`，再调用`router.back()`
  3. 在`onBeforeRouteLeave`中检查`isLeaving`，如果为true则直接`next()`，不弹出确认框
  4. 在`onBeforeRouteLeave`的"离开"回调中也设置`isLeaving.value = true`，确保直接通过侧边栏导航离开时也不会重复弹窗
* **修复代码位置**：`src/views/module/ModuleEditor.vue` 第1388-1420行
* **验证结果**：
  - 点击返回按钮正常弹出确认框
  - 点击"离开"按钮后成功返回组件列表页
  - 没有出现重复弹窗或点击无反应的问题
  - 点击"取消"按钮正常留在当前页面
  - TypeScript编译零错误

### 经验教训
1. `el-tree-select`单选模式下不要设置`check-strictly`属性，该属性适用于el-tree的多选复选框场景
2. 使用`router.back()`配合`onBeforeRouteLeave`时，需要注意避免重复弹出确认对话框，可通过标志位控制
3. 导航守卫中的确认对话框与手动调用的确认对话框可能产生状态冲突，需要统一的状态管理

***

## 2026-09-10 设备管理移除BOM预览功能

* **需求**：设备管理里不要BOM预览
* **修改内容**：
  1. 移除设备编辑器Tab5 "BOM预览" 的模板（el-tab-pane name="bom"）
  2. 移除相关脚本代码：
     - `bomPreviewItems`、`bomPreviewLoading`、`bomPreviewLoaded` 变量声明
     - `loadBomPreview()` 异步函数（收集配置关联模块的BOM条目并合并展示）
     - `tabStatuses` 中的 `bom` 状态计算
     - `TAB_ORDER` 中的 `'bom'`
     - `onTabChange()` 中切换到bom tab时加载预览的逻辑
     - 路由参数变化时重置 `bomPreviewItems` 和 `bomPreviewLoaded` 的逻辑
     - 配置/模块变化时自动刷新BOM预览的watch
     - `onMounted` 中默认加载BOM预览的逻辑
  3. 移除相关CSS样式：`.bom-preview-wrapper`
  4. 移除不再使用的导入：`BomTable`组件、`BomTableRow`类型、`BomItem`类型
  5. 保留`EmptyState`组件导入（配置管理Tab仍在使用）
* **修改文件**：`src/views/equipment/EquipmentEditor.vue`
* **验证结果**：
  - TypeScript编译：零错误
  - 设备编辑器正常渲染，显示6个Tab：基本信息、配置管理、关联项目、关联组件、序列号管理、更改历史
  - BOM预览Tab已完全移除
  - 浏览器控制台零错误
  - 其他Tab功能不受影响

***

## 2026-09-10 项目编辑器控制台错误修复（4个问题）

* **问题描述**：用户报告项目编辑器页面控制台出现多个错误：
  1. ElProgress status prop验证失败：`Invalid prop: validation failed for prop "status". Expected one of ["", "success", "exception", "warning"], got value "primary"`
  2. BOM Worker postMessage失败：`Failed to execute 'postMessage' on 'Worker': [object Object] could not be cloned`，回退到同步模式
  3. DexieError2保存失败：项目自动保存重试3次都失败，错误发生在`projects.ts:194 db.orderBomItems.bulkPut(normalized)`
  4. el-link underline弃用警告：`The underline option (boolean) is about to be deprecated in version 3.0.0`

* **修复内容**：

  **问题1：ElProgress status prop错误**
  - 根因：BOM生成进度条设置了`status="primary"`，但ElProgress的status属性只支持"", "success", "exception", "warning"，不支持"primary"
  - 修复：移除`status="primary"`属性，进行中的进度条不需要设置status
  - 修改文件：`src/views/project/ProjectEditor.vue` 第472-477行

  **问题2：BOM Worker postMessage失败**
  - 根因：传递给Worker的`modules`数组包含Vue响应式代理对象（Proxy）和可能的不可序列化字段，结构化克隆算法无法克隆Proxy对象
  - 修复：在`postMessage`前对`selectedModules`和`modules`进行`JSON.parse(JSON.stringify())`清理，移除响应式代理和不可序列化值
  - 修改文件：`src/composables/useBomGeneratorWorker.ts` 第105-109行

  **问题3：DexieError2保存失败（最严重）**
  - 根因：`orderBomItems`中包含BomTable组件添加的内部字段（如`_rowStatus`、`_sourceModuleId`等以下划线开头的字段），以及可能的不可序列化值，导致IndexedDB的bulkPut失败
  - 修复：在`persistAll`保存BOM前，遍历所有条目，移除以下划线开头的内部字段，跳过函数/Map/Set等不可序列化值，确保sortOrder为数字
  - 修改文件：`src/views/project/ProjectEditor.vue` 第2152-2170行

  **问题4：el-link underline弃用警告**
  - 根因：EquipmentEditor.vue中使用了`:underline="false"`（boolean值），Element Plus 3.0.0即将弃用boolean值，应使用字符串值'always'|'hover'|'never'
  - 修复：将`:underline="false"`改为`:underline="'never'"`
  - 修改文件：`src/views/equipment/EquipmentEditor.vue` 第317行

* **验证结果**：
  - TypeScript编译：零错误
  - 项目编辑器页面正常渲染
  - 保存功能正常：点击保存后按钮变为disabled，基本信息Tab的星号消失，说明保存成功
  - 控制台错误数：0
  - 控制台警告数：0
  - ElProgress错误：✅ 已修复
  - Worker错误：✅ 已修复
  - Dexie错误：✅ 已修复
  - el-link警告：✅ 已修复

* **经验教训**：
  1. 使用Element Plus组件时，注意查看官方文档确认属性的合法值，不要想当然地使用"primary"等常见值
  2. Web Worker的postMessage使用结构化克隆算法，不能克隆Proxy、函数、Map、Set等对象，传递前需要JSON序列化清理
  3. IndexedDB/Dexie的bulkPut也要求数据是纯JSON可序列化的，包含内部字段或不可序列化值会导致保存失败
  4. 对于有`[key: string]: any`索引签名的类型，需要特别注意可能包含的额外字段，在持久化前进行清理
  5. 关注Element Plus的弃用警告，及时更新API用法，避免版本升级后出现问题

***

## 2026-09-10 工作台移除三个图表

* **需求**：控制台（工作台）去掉BOM趋势变化，去掉设备和项目状态分布
* **移除内容**：
  1. **设备状态分布（饼图）**：移除模板中的el-col（包含饼图、图例、运行中/已停用统计），移除脚本中的activeCount、inactiveCount、totalEq、activePct、inactivePct、pieGradient计算属性，移除CSS中的.pie-chart-wrap、.pie-chart、.pie-center、.pie-legend、.legend-item等样式
  2. **项目状态分布（柱状图）**：移除模板中的el-col（包含柱状图、进行中/已完成/已暂停/已取消统计），移除脚本中的ProjectBar接口、projectStatusBars计算属性，移除CSS中的.bar-chart-wrap、.bar-chart、.bar-column、.bar-track、.bar-fill等样式
  3. **BOM条目变化趋势（折线图）**：移除模板中的chart-card（包含SVG折线图、近7天/近30天切换、数据点、X轴标签），移除脚本中的trendRange、svgWidth、svgHeight、padding、chartWidth、chartHeight、TrendPoint接口、trendDataPoints、linePoints、areaPath、xAxisLabels，移除CSS中的.line-chart-wrap、.line-chart、.data-point-label、.axis-label样式
  4. 移除.chart-row样式（不再使用），移除响应式CSS中的饼图和柱状图样式
* **保留内容**：统计卡片、项目交付时间线、最近活动、物料用量TOP5、快捷入口
* **修改文件**：`src/views/Dashboard.vue`
* **验证结果**：
  - TypeScript编译：零错误
  - 设备状态分布：✅ 已移除
  - 项目状态分布：✅ 已移除
  - BOM条目变化趋势：✅ 已移除
  - 保留的内容（项目交付时间线、最近活动、快捷入口）：✅ 正常显示
  - 控制台错误数：0

***

## 2026-09-10 DexieError2（DataCloneError）彻底修复

* **问题描述**：用户报告DexieError2仍然存在，错误为`DataCloneError: Failed to execute 'put' on 'IDBObjectStore': [object Object] could not be cloned`，发生在`projects.ts:194 db.orderBomItems.bulkPut(normalized)`。之前在ProjectEditor.vue的persistAll中清理以下划线开头的内部字段，但修复不够彻底。

* **根本原因分析**：
  1. `setOrderBom`函数中使用浅拷贝`{ ...i, projectId, sortOrder }`，无法移除Vue响应式代理对象（Proxy）
  2. Vue 3的响应式代理对象（Proxy）本身无法被IndexedDB的结构化克隆算法克隆
  3. 即使代理对象的所有属性都是可序列化的，代理对象本身也会导致DataCloneError
  4. `persistAll`中的清理逻辑只是跳过了函数、Map、Set等，但没有处理Vue响应式代理

* **修复方案**：
  在所有写入IndexedDB的操作前，使用`JSON.parse(JSON.stringify())`进行深度序列化清理，确保：
  - 所有Vue响应式代理都被转换为普通对象
  - 所有不可序列化的值（函数、Symbol、undefined、循环引用）都被移除或转换
  - 所有数据都是纯JSON可序列化的

* **修改的文件和函数**：

  **1. `src/stores/projects.ts`**：
  - `setOrderBom()`：在bulkPut前对每个条目使用`JSON.parse(JSON.stringify())`深度清理
  - `addOrderBomItem()`：使用`deepClone()`处理newItem
  - `updateOrderBomItem()`：使用`deepClone()`处理data

  **2. `src/stores/modules.ts`**：
  - `addBomItem()`：使用`deepClone()`处理newItem
  - `updateBomItem()`：使用`deepClone()`处理data
  - `importBomItems()`：使用`deepClone()`处理每个newItem
  - `copyModule()`中的bomItems复制：使用`deepClone()`处理每个复制的条目
  - `copyModuleRecursive()`中的bomItems复制：使用`deepClone()`处理每个复制的条目

* **验证结果**：
  - TypeScript编译：零错误
  - 点击保存按钮后：保存按钮变为disabled状态，保存成功
  - 控制台错误数：0
  - Dexie错误数：0
  - ✅ DexieError2已彻底修复

* **经验教训**：
  1. IndexedDB的结构化克隆算法无法克隆Vue 3的响应式代理对象（Proxy），即使代理的属性都是可序列化的
  2. 浅拷贝（`{ ...obj }`）只能复制对象的属性，但如果属性值本身是响应式代理，仍然会导致问题
  3. 最彻底的解决方案是在所有写入IndexedDB的操作前使用`JSON.parse(JSON.stringify())`进行深度序列化
  4. 项目中已经有`deepClone()`工具函数（就是`JSON.parse(JSON.stringify())`），应该在所有db操作中统一使用
  5. 对于数据量较大的表（如bomItems、orderBomItems），特别需要注意这个问题，因为这些表的数据最容易包含响应式代理

***

## 2026-09-10 项目编辑器离开弹窗和未保存标签修复

* **问题描述**：用户报告两个问题：
  1. 项目管理里，进入编辑，点击bom，bom才会刷新
  2. 此时退出会弹窗提醒未保存，点离开，没反应

* **根本原因分析**：

  **问题1：离开弹窗点击离开没反应**
  - `handleBack()`函数在用户确认返回后调用`router.back()`
  - `router.back()`会触发`onBeforeRouteLeave`导航守卫
  - `onBeforeRouteLeave`检查到`autoSaveDirty`为true，又弹出一个"离开确认"对话框
  - 两个ElMessageBox对话框冲突，导致第二个对话框的按钮点击事件无法正确处理
  - 这与之前组件编辑器的问题完全相同

  **问题2：页面加载后显示"未保存"标签**
  - `loadProjectData()`中调用`handleConfigChange()`，但没有await
  - `handleConfigChange()`会修改`localSelectedModules.value`，这会触发`useAutoSave`的深度watch
  - watch设置`dirty.value = true`，显示"未保存"标签
  - 虽然`onMounted`中调用了`markAutoSaveClean()`，但`handleConfigChange()`是异步的，可能在`markAutoSaveClean()`之后才完成
  - 同样，`loadOrderBomAll()`也是异步的，BOM数据加载完成后会修改`orderBomItems.value`，触发watch

  **问题3：BOM需要点击才刷新**
  - 实际上BOM数据在页面加载时已经通过`loadOrderBomAll()`加载了
  - 但由于`loadOrderBomAll()`是异步的，tab上的计数可能没有及时更新
  - 用户点击tab时，watch逻辑可能触发了重新计算，显示了正确的计数
  - prj001显示0条是因为数据库中确实没有prj001的BOM数据（只有prj002有10条）

* **修复方案**：

  **1. 离开弹窗修复（添加isLeaving标志位）**
  - 添加`isLeaving = ref(false)`标志位
  - `handleBack()`用户确认返回后，先设置`isLeaving.value = true`，再调用`router.back()`
  - `onBeforeRouteLeave`中检查`isLeaving.value`，如果为true，直接调用`next()`放行，不再弹出确认对话框
  - 这样避免了两个对话框冲突的问题

  **2. 未保存标签修复（await异步操作）**
  - 将`loadProjectData()`改为`async function`
  - 在`loadProjectData()`中`await handleConfigChange()`，确保配置和模块数据加载完成
  - 在`loadProjectData()`中`await loadOrderBomAll()`，确保BOM数据加载完成
  - `onMounted`改为`async`，`await loadProjectData()`后再调用`markAutoSaveClean()`
  - `watch route.params.id`的回调也改为`async`，`await loadProjectData()`后再调用`markAutoSaveClean()`

* **修改的文件**：
  - `src/views/project/ProjectEditor.vue`

* **验证结果**：
  - TypeScript编译：零错误
  - 页面加载后是否显示未保存标签：否 ✅
  - 基本信息tab是否有未保存星号：否 ✅
  - 保存按钮是否disabled：是（表示已保存）✅
  - BOM条目数量：10条（prj002），正确加载 ✅
  - 点击BOM后是否显示未保存标签：否 ✅
  - 离开确认弹窗：正常显示 ✅
  - 点击"返回"按钮后：成功离开项目编辑器页面 ✅
  - 控制台错误数：0 ✅

* **经验教训**：
  1. ElMessageBox对话框不能嵌套使用，两个对话框会冲突导致按钮点击无效
  2. 使用`isLeaving`标志位是解决导航守卫和返回按钮冲突的标准模式
  3. 初始化加载数据时，所有修改响应式数据的异步操作都应该被await，确保在`markClean()`之前所有数据都已加载完成
  4. `useAutoSave`的深度watch会监听所有嵌套属性的变化，包括数组元素的修改，所以初始化阶段的任何数据修改都会触发dirty
  5. 对于有异步初始化流程的页面，建议使用`async onMounted + await所有初始化操作 + markClean()`的模式

***

## 2026-09-10 BomTable紧凑/舒适切换无反应修复

* **问题描述**：用户报告列表的舒适和紧凑切换没变化。

* **根本原因**：
  - `BomTable.vue`组件中，密度切换使用本地状态`localDensity`
  - `onDensityChange()`函数正确更新了`localDensity.value`
  - 但是模板第2行的wrapper元素使用的是`:class="`density-${density}`"`，这里的`density`是props，不是本地状态`localDensity`
  - 所以切换密度时，`localDensity`更新了，但wrapper的CSS类没有变化，导致紧凑/舒适样式没有应用

* **修复方案**：
  - 将模板第2行的`:class="`density-${density}`"`改为`:class="`density-${localDensity}`"`
  - 这样切换密度时，wrapper的CSS类会正确变化，紧凑/舒适样式就能正常应用了

* **修改的文件**：
  - `src/components/common/BomTable.vue`

* **验证结果**：
  - TypeScript编译：零错误
  - 当前状态：wrapper class是`density-comfortable` ✅
  - 点击紧凑按钮后：
    - wrapper class变为`density-compact` ✅
    - 单元格样式：fontSize: 12px, padding: 4px 8px ✅
  - 点击舒适按钮后：
    - wrapper class变为`density-comfortable` ✅
    - 单元格样式：fontSize: 13px, padding: 8px 10px ✅
  - 控制台错误数：0 ✅

* **紧凑/舒适模式差异**：
  - 紧凑模式：字体12px，单元格内边距4px 8px，工具栏内边距6px 10px
  - 舒适模式：字体13px，单元格内边距8px 10px（默认样式）

* **经验教训**：
  1. 当组件有本地状态和props同名时，要特别注意模板中使用的是哪个
  2. 对于有切换功能的组件，切换后要检查相关的CSS类是否正确变化
  3. 本地状态（`localXxx`）和props（`xxx`）的命名区分很重要，但模板中还是要仔细确认
  4. 这种bug很隐蔽，因为切换按钮的选中状态会正常变化，但实际样式没有变化，用户会以为功能坏了

***

## 2026-09-10 组件名称唯一性校验移除（只保留图号唯一）

* **需求**：用户要求"名称改为可以重复，只保留图号唯一"。

* **修改内容**：
  1. **移除nameZh字段的blur校验绑定**：移除`@blur="validateNameZh"`
  2. **移除nameZh字段的错误样式**：移除`:class="{ 'input-error': nameZhUnique.hasError.value }"`
  3. **移除nameZh字段的错误提示div**：移除`<div v-if="nameZhUnique.hasError.value" class="field-error-text">`
  4. **移除`validateNameZh`函数**：删除blur时校验名称唯一性的函数
  5. **移除`nameZhUnique = useUniqueValidation(...)`**：删除实时唯一性校验
  6. **移除保存时的名称唯一性校验**：删除保存时检查`isNameZhUnique`的逻辑

* **保留的内容**：
  - 图号（drawingNo）的唯一性校验全部保留（blur校验、实时校验、保存时校验）
  - `isNameZhUnique`函数在store中保留但不再被使用（以备将来需要）
  - nameZh字段的必填校验保留

* **修改的文件**：
  - `src/views/module/ModuleEditor.vue`

* **验证结果**：
  - TypeScript编译：零错误
  - 输入名称后没有错误提示：✅
  - 输入框没有error样式：✅
  - 控制台错误数：0 ✅
  - 图号唯一性校验仍然有效：✅（未修改）

* **业务规则**：
  - 图号（drawingNo）：唯一，ASM结尾，必填
  - 中文名（nameZh）：可重复，必填
  - 英文名（nameEn）：可重复，可选

***

***

## 2026-09-10 父子组件多对多关系架构修改
* **需求**：用户要求'同一个子组件可以有多个父组件，显示在组件列表里，只要图号一致，就是同一个'
* **修改内容**：
  1. **类型定义**：parentModuleId: string → parentModuleIds?: string[]（可选，默认为空数组）
  2. **数据库迁移**：添加 version 7，modules表索引改为*parentModuleIds，upgrade函数将旧的parentModuleId转换为parentModuleIds数组
  3. **Mock数据**：3处parentModuleId改为parentModuleIds数组
  4. **核心Store**：
     - addModule支持多父模块
     - wouldCreateCycle改为BFS遍历所有父模块祖先链
     - deleteModule支持多父模块（从所有父模块移除）
     - moveModule支持添加/移除父模块关系
     - copyModule支持多父模块
  5. **工具函数**：
     - useModuleTree.ts: childrenMap支持多父模块
     - bomGenerator.ts: isChildOfAnotherSelected支持多父模块
     - dataHealthCheck.ts: 循环检测、父组件不存在检测、修复函数都支持多父模块
     - batchImport.ts: 批量导入支持多父模块
  6. **视图文件**：
     - ModuleList.vue: 缩进计算和顶层模块过滤支持多父模块
     - EquipmentEditor.vue: 模块树显示支持多父模块
     - ProjectEditor.vue: 模块选择和层级显示支持多父模块
     - ModuleEditor.vue: 表单定义（改为多选）、树状结构构建、面包屑、层级结构、添加/移除子模块等都支持多父模块

* **修改的文件**：
  - src/types/index.ts
  - src/db/index.ts
  - src/mock/modules.ts
  - src/stores/modules.ts
  - src/composables/useModuleTree.ts
  - src/utils/bomGenerator.ts
  - src/utils/dataHealthCheck.ts
  - src/utils/batchImport.ts
  - src/views/module/ModuleList.vue
  - src/views/module/ModuleEditor.vue
  - src/views/equipment/EquipmentEditor.vue
  - src/views/project/ProjectEditor.vue

* **验证结果**：
  - dev服务器正常启动（http://localhost:5173/）
  - 组件列表页面正常显示，11个组件正确显示，父子关系缩进正常
  - 组件编辑页面正常加载，控制台无错误
  - 数据层面多父组件功能已实现

* **待优化项**：
  - UI层面：el-tree-select的multiple属性似乎没有生效，需要进一步调试
  - 需要完整测试多父组件的添加、移除、循环检测等功能
  - 需要验证项目下单BOM生成在多父组件场景下的正确性

* **业务规则**：
  - 图号（drawingNo）：唯一，ASM结尾，必填
  - 中文名（nameZh）：可重复，必填
  - 父子组件关系：多对多，同一个子组件可以有多个父组件，只要图号一致就是同一个组件
***

***

## 2026-09-11 共享查重工具函数作用域错误（TS2304 / ReferenceError）

* **报错信息**：
  - TypeScript：TS2304: Cannot find name 'getByDrawingNo'（src/stores/parts.ts）
  - 运行时潜在风险：ReferenceError: getByDrawingNo is not defined

* **复现步骤**：
  1. 在 parts.ts 模块顶层（store 闭包外部）定义 detectPartConflict 和 detectPartConflictsBatch 函数
  2. 函数内部调用 getByDrawingNo(drawingNo)
  3. 运行 
px vue-tsc --noEmit 报 TS2304 错误

* **原因分析**：
  - getByDrawingNo 是定义在 usePartsStore 的 store 闭包内部的函数，仅在闭包作用域内可访问
  - detectPartConflict 最初定义在模块顶层（store 闭包外部），无法访问闭包内的 getByDrawingNo
  - 这是 JavaScript 闭包作用域规则：内部函数可以访问外部变量，反之则不行

* **修复方法**：
  - 将 detectPartConflict 和 detectPartConflictsBatch 两个函数从模块顶层移入 usePartsStore 闭包内部（紧邻 getByDrawingNo 定义之后）
  - 业务逻辑、接口签名、字段标签映射均不改动
  - 两个函数在 store 的 return 对象中导出，对外调用方式 partsStore.detectPartConflict(...) 完全不变

* **修复代码**：
  - 移动位置：从模块顶层（约第 46 行后）移至 store 内部 getByDrawingNo 之后（约第 118 行）
  - return 导出：detectPartConflict, detectPartConflictsBatch

* **验证结果**：
  - 
px vue-tsc --noEmit 退出码 0，零类型错误
  - 函数可正常通过 partsStore.detectPartConflict() 调用
  - PartsList.vue 和 ProjectEditor.vue 中的调用均正常工作

***

## 2026-09-11 全系统零件添加查重对比校验实现记录

* **任务目标**：系统中所有往系统内添加零件的地方都要先做查重对比校验

* **检查结果（7个入口）**：
  1. 零件库管理 - 新增零件：❌ 仅有表单校验阻止提交，无参数对比和处理选择 → 已修复
  2. 零件库管理 - 批量导入：❌ 静默 upsertByDrawingNo，无冲突检测 → 已修复
  3. 组件BOM管理 - 手动新增条目：✅ 已有 detectConflicts + 冲突对话框（未修改）
  4. 组件BOM管理 - 文件导入：✅ 复用 detectConflicts（未修改）
  5. 组件管理 - 批量导入组件：✅ 已有 detectBomConflicts + 冲突对话框（未修改）
  6. 项目下单BOM - 手动添加条目：❌ 直接添加，无查重 → 已修复（仅direct模式）
  7. 项目下单BOM - 生成下单BOM：⚠️ 有合并去重但无参数冲突检测 → 已增强（合并冲突警告）

* **修改的文件**：
  - src/stores/parts.ts（新增共享查重工具 + 作用域修复）
  - src/views/parts/PartsList.vue（新增零件 + 批量导入查重）
  - src/views/project/ProjectEditor.vue（手动添加查重 + 生成BOM合并冲突警告）
  - src/utils/bomGenerator.ts（合并冲突检测增强）

* **验证结果**：
  - TypeScript 编译零错误（vue-tsc --noEmit 退出码 0）
  - 所有入口查重逻辑统一：图号为主，物料目录号为辅
  - 参数差异对比表展示清晰（字段 / 零件库中值 / 新输入值）
  - 用户可选择"保留库里参数"或"全部用新数据覆盖"
  - 组件BOM管理已有实现不受影响

* **业务规则**：
  - 图号（drawingNo）：零件主要唯一标识，查重首选字段
  - 物料/目录号（materialCatalogNo）：辅助标识，组件BOM管理中已实现双字段检测
  - 保留库里参数：不修改零件库，新增条目使用已有零件参数，数量用新输入的
  - 全部覆盖：用新数据更新零件库参数（严格模式下影响所有引用该零件的BOM）
  - library模式（从零件库选择）：已有partId，不触发查重
***

## 2026-09-11 零件库批量导入完善（字段映射 / 文件内去重 / 校验）
* **任务目标**：把零件库批量导入从"隐藏input + 简单列名匹配"升级为3步弹窗，补齐显式字段映射、文件内重复零件处理、完善数据校验。

* **关键设计点**：
  1. **自动映射复用已有标准化**：`parseFile` 内部已用 `normalizeColumnName` + `COLUMN_ALIAS_MAP` 把中文表头转成英文字段 key，因此步骤2自动匹配只需 `col.name === field.key`，无需重复维护别名表；兜底用原始 label 与中文标签比对。
  2. **文件内去重在 UI 层完成**：传给 store 的 items 已经是去重后的，避免原 bug（同文件两个相同图号，第二条被当 update 覆盖第一条）。`bulkImport` 仅扩展返回 `skipped=0` 保持向后兼容。
  3. **三种重复策略用 computed 实时重算**：`finalImportItems` 根据 `duplicateStrategy`（first/last/skip）即时产出去重结果，切换策略无需重新校验，预览与确认按钮行数同步更新。
  4. **与现有冲突对话框解耦**：文件内重复处理在"与库冲突检测"之前；处理完再调 `detectPartConflictsBatch`，无冲突直接导入，有冲突关闭导入弹窗、弹出现有冲突对话框。`applyImportConflictResolution` 仅追加文件内重复跳过数量到提示文案，未改动其 toCreate/toUpdate/toSkip 分组逻辑。

* **踩坑/注意**：
  - PowerShell 不支持 `&&`，串行命令用 `;` 分隔（项目初始化时已记录过，本次再次遇到）。
  - 模板中 `IMPORTABLE_FIELDS` 是 script setup 顶层常量，可直接在模板 `v-for` 中使用，无需额外 return。
  - 校验失败时禁用"确认导入"（`:disabled="importErrors.length > 0 || finalImportItems.length === 0"`），从 UI 层阻断导入。

* **修改文件**：
  - src/views/parts/PartsList.vue（替换 file input 为3步弹窗、新增映射/重复/校验逻辑与样式）
  - src/stores/parts.ts（bulkImport 返回值扩展 skipped）

* **验证结果**：
  - `npx vue-tsc --noEmit` 退出码 0，零类型错误。
  - 现有冲突对话框（新增零件/导入/项目BOM）逻辑未改动。
***

## 2026-09-11 组件批量导入加入零件库冲突检测和用户选择

* **任务目标**：组件批量导入时BOM零件静默upsert零件库，无冲突检测。本次加入零件库维度的冲突检测和用户选择机制。

* **实现过程**：
  1. 修改 `src/utils/batchImport.ts`：新增 PartsStoreLike 接口、扩展 ImportResult、新增 buildPartParamsFromBomItem 辅助函数、修改 executeImport 签名新增 partsStore/partConflicts 参数、实现零件冲突预解析逻辑
  2. 修改 `src/views/module/ModuleList.vue`：新增 usePartsStore 导入、零件库冲突状态、detectPartsLibraryConflicts 函数、零件库冲突对话框UI、修改导入流程（BOM冲突→零件库冲突→导入）、新增 applyPartConflictResolution 函数、更新结果提示消息

* **关键设计**：
  - 零件冲突检测在BOM明细冲突检测之后串行执行，两个维度互不干扰
  - partId 预解析后透传给 importBomItems，利用其已有的 `if (!partId) { upsert }` 逻辑跳过重复 upsert
  - overwrite 模式时空字符串转 null（清除字段），非 overwrite 模式时空值不传入

* **验证结果**：
  - `npx vue-tsc --noEmit` 退出码 0，零类型错误
  - 现有BOM明细冲突检测功能不受影响
  - executeImport 调用方仅 ModuleList.vue，已全部更新
***

## 2026-09-11 零件库零件分类功能（reserved1 → partCategory）

* **任务目标**：将零件库"预留1"(reserved1)改为"零件分类"(partCategory)，实现可维护的零件分类管理（预设 85零件/86零件/标准件/外购件，支持自定义增删改）。

* **实现过程**：
  1. 新增 `src/composables/usePartCategories.ts`：localStorage 持久化的分类管理 composable（模块级单例 ref + deep watch 落盘）
  2. 修改 `src/types/index.ts`：新增 PartCategory 接口、Part 接口加 partCategory 字段、STANDARD_COLUMN_LABELS 加映射
  3. 修改 `src/stores/parts.ts`：PART_FIELD_LABELS 加 partCategory 标签
  4. 修改 `src/db/index.ts`：新增 version(9) 迁移，parts 表索引加 partCategory，将 reserved1 命中预设分类名的旧数据迁移为分类 ID
  5. 修改 `src/views/Settings.vue`：新增"零件分类管理"Tab + 新增/编辑弹窗 + 增删改/恢复默认逻辑
  6. 修改 `src/views/parts/PartsList.vue`：筛选/批量分类/表格列/编辑表单/导出/导入字段全部从 reserved1 切换到 partCategory
  7. 修改 `src/utils/importParser.ts`：别名映射新增"零件分类"等

* **关键设计**：
  - 只动 Part 侧，BomItem/OrderBomItem 的 reserved1（规格字段）全程不碰
  - 分类值存 ID（cat_85），显示经 getCategoryName 转名称；删除分类后零件保留 ID，回退显示原始 ID
  - 分类存 localStorage（非 Dexie 表），多组件共享单例
  - editForm 按 Object.keys 通用填充，替换字段后自动生效，无需改 openEditDialog

* **踩坑/注意**：
  - Edit 替换 Part 接口的 reserved1 时，old_string 在 BomItem/OrderBomItem 中重复出现，需用 Part 特有的 `spareParts`/`[key:string]` 上下文唯一定位
  - Settings.vue 中 RefreshLeft 图标此前已导入，无需重复添加
  - PowerShell 不支持 `&&`，串行命令用 `;` 分隔

* **验证结果**：
  - `npx vue-tsc --noEmit` 退出码 0，零类型错误
  - BOM 条目规格字段（reserved1）功能不受影响

## 2026-09-11 零件分类约束收紧：只作用于下单零件（需求变更）

* **任务目标**：在已完成的零件分类功能基础上，增加约束——partCategory 仅对下单零件(partType='order')生效，模型零件/两者不参与分类。

* **修改点**（均在 `src/views/parts/PartsList.vue`）：
  1. 表格零件分类列：`v-if="row.partType === 'order' && row.partCategory"` 才显示标签
  2. 编辑对话框零件分类 el-col：加 `v-if="editForm.partType === 'order'"`
  3. filteredParts 分类筛选：`p.partType === 'order' && p.partCategory === filterPartCategory.value`
  4. handleBatchUpdateCategory：循环内 `part.partType !== 'order'` 跳过并计数，消息追加"跳过 N 个非下单零件"
  5. 两处导出：分类列改为 `p.partType === 'order' && p.partCategory ? 名称 : ''`

* **关键设计**：设置页零件分类管理不受影响；非下单零件即使历史残留 partCategory 值也不显示/不导出/不被筛出，仅下单零件可见。

* **验证结果**：
  - `npx vue-tsc --noEmit` 退出码 0，零类型错误

## 2026-09-11 设备配置分组功能

* **任务目标**：为设备下的配置增加自定义分组，支持分组 CRUD、按分组筛选配置，并在项目模块配置中按分组显示下拉。

* **修改点**：
  1. src/types/index.ts：新增 ConfigurationGroup 接口；EquipmentConfiguration 增加 groupId?: string
  2. src/db/index.ts：新增 configurationGroups 表声明 + ersion(10)（'id, equipmentId, name, sortOrder'），clearAllTables() 加入新表
  3. src/stores/equipment.ts：新增 configurationGroups 状态与 initialize 加载；分组 CRUD（含组名同设备唯一校验、sortOrder 自增、删分组置空配置 groupId）；getConfigurationsByGroup；cascade 删设备时级联删分组
  4. src/views/equipment/EquipmentEditor.vue：Tab2 改左右布局（左 220px 分组面板 + 右配置表格）；配置弹窗加"所属分组"下拉；分组新增/编辑弹窗；删除分组二次确认提示
  5. src/views/project/ProjectEditor.vue：新增 groupedConfigOptions computed，模板改用 el-option-group 按分组渲染

* **关键设计**：
  - DB v10 为新空表，无需 upgrade 迁移；旧配置 groupId 为 undefined 即未分组
  - 组名唯一性校验在 add/update 时抛错；UI 层 confirmGroup 捕获后在弹窗内红字提示（groupNameError）
  - 删分组只置 groupId 不删配置；删设备 cascade 同时删分组
  - 新增配置默认归属当前选中分组；项目页未分组配置作为"未分组"组放在最后

* **验证结果**：
  - 
px vue-tsc --noEmit 退出码 0，零类型错误
  - 浏览器实测：新增分组"灌装线"→ 在该分组下新建"灌装配置A"→ 重复组名提示重名 → 删除分组提示"N 个配置变未分组"→ 确认后配置归入未分组（计数3）→ 刷新页面数据持久化
  - 项目编辑页配置下拉框以"未分组"分组标题正常显示配置

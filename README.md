# 小说资料库 · Novel Collection

一个用来存放小说创作资料的个人网站：**设定 / 势力 / 灵感 / 技能名 / 角色 / 情节 / 地点 / 道具 / 时间线**，
模块和字段都能随时扩展，数据以 JSON 文件存放在你自己的 GitHub 仓库里。

## 它是怎么组织的

```
首页（小说列表）
 └─ 点某本小说 → 模块列表
      └─ 点某模块（如「角色」）→ 该模块的条目列表
           └─ 点某条目 → 查看 / 编辑详细字段
```

每一层都有一个 **「+」卡片**可以继续新增。每个模块有独立图标，支持**上传 `.svg` 文件或粘贴 SVG 代码**自定义替换。

## 核心特性

- **三级嵌套导航**：小说 → 模块 → 条目，像翻文件夹一样层层深入
- **模块可无限扩展**：想加「功法」「宗门」「神器」……用「+」自己建，名称、图标、主题色都能定
- **字段可自定义**：每个模块的条目能填什么，由该模块的「字段定义」决定，支持单行/多行文本、下拉、标签、日期、数字、链接、图片
- **数据即文件**：全部存在仓库的 `public/data/` 里，有完整的 git 历史，可随时手动改
- **网页内直接提交**：填一次 GitHub Token，之后网页里的新增/修改会自动变成真实 commit
- **玻璃拟态界面**：浅色 / 暗色主题，极光渐变背景

## 本地运行

```bash
npm install
npm run dev        # http://localhost:5173
```

其它命令：

```bash
npm run typecheck  # 类型检查
npm run build      # 构建到 dist/
npm run preview    # 本地预览构建产物 → http://localhost:4173/novel_create/
```

## 数据结构

```
public/data/
  index.json                       # 小说清单（首页只读这个）
  novels/
    novel_qingming.json            # 一本小说一个文件，含全部模块与条目
    novel_xinggui.json
```

类型定义见 `src/types/data.ts`。每个模块自带一份「字段说明书」（`fields`），
条目按说明书把值填进 `values`：

```jsonc
{
  "id": "mod_qm_char",
  "name": "角色",
  "icon": { "type": "builtin", "name": "user" },
  "fields": [
    { "key": "name", "label": "姓名", "type": "text", "required": true, "order": 0 }
  ],
  "entries": [
    { "id": "ent_1", "values": { "name": "林砚" }, "order": 0 }
  ]
}
```

> 新增字段后，老条目缺这个键只是显示为空 —— 天然兼容，不需要迁移。

## 让网页里的改动提交到 GitHub

1. 打开 GitHub 的 [Fine-grained tokens 创建页](https://github.com/settings/personal-access-tokens/new)
2. **Repository access** 选「Only select repositories」，只勾选这个小说仓库
3. **Permissions → Repository permissions** → 找到 `Contents`，设为 **Read and write**
4. **Expiration** 建议设置（如 90 天）
5. 点 **Generate token**，复制 `github_pat_…`
6. 回到网站 → 右上角「设置」，填入用户名、仓库名、分支和 Token，点「测试连接」

### 安全须知

- Token 只保存在**你自己浏览器的 localStorage** 里，不会上传到任何服务器
- 不要使用权限过大的 Classic Token；本项目只需要 `Contents: Read and write`
- 不要在公用电脑上勾选「记住 Token」
- Token 一旦泄露，立刻到 GitHub 撤销并重建

## 部署到 GitHub Pages

### 1. 改 base 路径

`vite.config.ts` 里的 `SITE_BASE` 需要与仓库名一致：

```ts
const SITE_BASE = '/你的仓库名/'
```

例如仓库叫 `novel_create`，就保持 `/novel_create/`。

> 开发服务器仍跑在根路径 `http://localhost:5173/`；
> 构建与预览（`npm run build` / `npm run preview`）会自动切到子路径，
> 预览地址为 `http://localhost:4173/novel_create/`。

### 2. 推送代码

```bash
git init
git add .
git commit -m "init: 小说资料库"
git branch -M main
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
```

### 3. 开启 Pages

仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
`.github/workflows/deploy.yml` 会在每次 push 后自动构建并发布。

> 也可以选 **Deploy from a branch**，分支选 `gh-pages`（需先执行 `npm run build` 并把这个分支推上去）。
> 项目已包含 `.nojekyll`，可避免 Pages 的 Jekyll 处理导致的资源 404。

部署完成后访问：`https://<用户名>.github.io/<仓库名>/`

## 目录结构

```
src/
  types/        数据类型定义
  lib/          读取策略、GitHub API、SVG 清洗、内置图标、工具函数
  store/        设置 / 数据 / 纯函数 reducers
  components/   layout · common · icons · novel · module · entry · field
  pages/        HomePage · NovelPage · ModulePage · SettingsPage
  styles/       设计变量与玻璃拟态样式
```

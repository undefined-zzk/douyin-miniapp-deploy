# 抖音小程序批量部署工具

基于 `tt-ide-cli` 封装的抖音小程序批量上传代码和提审工具，支持交互式命令行操作。适用于多类型、多小程序的批量管理。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](package.json)

## 环境要求

| 依赖 | 版本 |
|---|---|
| Node.js | >= 18.x |
| npm | >= 9.x |

## 快速开始

```bash
# 克隆项目
git clone <repo-url>
cd tt-ide-cli-js

# 安装依赖
npm install

# 配置（重要！）
cp config.example.js config.js
# 编辑 config.js，填入项目路径和小程序信息

# 启动
npm start
```

## 配置

复制 `config.example.js` 为 `config.js` 后修改：

### TYPES — 类型定义

定义所有小程序类型，key 对应 apps 中的 `type` 字段。可自由增删：

```js
const TYPES = {
  novel: { name: "小说", icon: "📖" },
  skit:  { name: "短剧", icon: "🎬" },
  // game: { name: "游戏", icon: "🎮" },   // 新增类型示例
};
```

### PROJECT_PATHS — 项目路径

每种类型对应的项目根目录，key 必须与 `TYPES` 一致：

```js
const PROJECT_PATHS = {
  novel: "D:\\hys-project\\novel-tt-native",
  skit:  "D:\\hys-project\\tiktok-skit-applet",
};
```

### apps — 小程序列表

| 字段 | 说明 |
|---|---|
| `no` | 自定义标识，必须填写，整数，> 0，≤ 9999 |
| `name` | 小程序名称，`enabled: true` 时必填 |
| `appid` | 小程序 AppID，`enabled: true` 时必填 |
| `type` | 类型，对应 `TYPES` 的 key |
| `hosts` | 宿主应用列表，填 `HOSTS` 即可 |
| `enabled` | `true` 启用 / `false` 禁用（禁用时可留空 name 和 appid 作为占位） |

```js
apps: [
  { no: 1, name: "我的小程序", appid: "tt...", type: "novel", hosts: HOSTS, enabled: true },
],
```

### 启动时自动校验

`npm start` 启动时会自动校验配置：

| 校验项 | 说明 |
|---|---|
| `no` | 必须存在、整数、> 0、≤ 9999 |
| `name` | `enabled: true` 时不能为空 |
| `appid` | `enabled: true` 时不能为空，格式以 `tt` 开头，全局不能重复 |
| `type` | 不能为空，必须在 `TYPES` 和 `PROJECT_PATHS` 中定义 |
| `hosts` | 必须是非空数组 |
| `enabled` | 必须是布尔值 |

> **注意：** `config.js` 已被 `.gitignore` 忽略，不会被提交到仓库。

## 使用

```bash
npm start
```

### 操作流程

1. 启动后校验配置
2. 自动检测登录态，未登录会引导登录
3. 自动扫描项目目录，同步小程序配置
4. 选择操作：上传代码 / 提交审核 / 一键上传+提审
5. 空格勾选目标小程序（按类型分组，支持「全选本组」「全部小程序」）
6. 按类型独立输入版本号
7. 选择提审宿主应用
8. 确认执行

### 快捷键

| 按键 | 功能 |
|---|---|
| `ESC` | 任意界面直接退出 |
| `空格` | 勾选/取消勾选目标小程序 |
| `回车` | 确认选择 |

## 项目结构

```
tt-ide-cli-js/
├── config.example.js  # 配置文件模板（复制为 config.js 后使用）
├── index.js           # 主入口，交互式菜单
├── upload.js          # 上传模块
├── audit.js           # 提审模块
├── fetch-apps.js      # 获取小程序信息工具
├── package.json
├── .gitignore
├── LICENSE
└── README.md
```

## 宿主应用

| 值 | 说明 |
|---|---|
| `douyin` | 抖音 (iOS & Android) |
| `douyin_lite` | 抖音极速版 |
| `douyin_harmony` | 抖音鸿蒙 |
| `douyin_lite_harmony` | 抖音极速版鸿蒙 |
| `huoshan` | 抖音火山版 |
| `toutiao` | 今日头条 (iOS & Android) |
| `tt_lite` | 今日头条极速版 |

## License

[MIT](LICENSE)

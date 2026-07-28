/**
 * douyin-miniapp-deploy 抖音小程序批量部署配置（示例文件）
 *
 * 使用方法：
 *   复制此文件为 config.js，然后修改为你自己的配置
 *
 * TYPES：       定义所有小程序类型，key 对应 apps 中的 type 字段
 * PROJECT_PATHS：每种类型对应的项目根目录
 * HOSTS：       宿主应用列表
 * apps：        小程序配置，enabled: true 启用，no 按类型各自编号
 */

// ==================== 类型定义 ====================
// key 对应 apps 中每项的 type 字段，可自由增删
const TYPES = {
  novel: {
    name: "小说",
    icon: "📖",
  },
  skit: {
    name: "短剧",
    icon: "🎬",
  },
  // 示例：新增其他类型
  // game: {
  //   name: "游戏",
  //   icon: "🎮",
  // },
  // shop: {
  //   name: "电商",
  //   icon: "🛒",
  // },
};

// ==================== 项目路径映射 ====================
// key 必须与 TYPES 中的 key 一致
const PROJECT_PATHS = {
  novel: "D:\\hys-project\\novel-tt-native",
  skit: "D:\\hys-project\\tiktok-skit-applet",
};

// ==================== 宿主应用列表 ====================
const HOSTS = [
  "douyin",              // 抖音 (iOS & Android)
  "douyin_lite",         // 抖音极速版
  "douyin_harmony",      // 抖音鸿蒙
  "douyin_lite_harmony", // 抖音极速版鸿蒙
  "huoshan",             // 抖音火山版
  "toutiao",             // 今日头条 (iOS & Android)
  "tt_lite",             // 今日头条极速版
];

// ==================== 小程序列表 ====================
module.exports = {
  TYPES,
  PROJECT_PATHS,
  defaultHosts: HOSTS,

  apps: [
    // 小说
    { no: 1, name: "示例小说1", appid: "tt000000000000000001", type: "novel", hosts: HOSTS, enabled: true },
    { no: 2, name: "示例小说2", appid: "tt000000000000000002", type: "novel", hosts: HOSTS, enabled: false },
    // 短剧
    { no: 1, name: "示例短剧1", appid: "tt000000000000000101", type: "skit", hosts: HOSTS, enabled: true },
    { no: 2, name: "示例短剧2", appid: "tt000000000000000102", type: "skit", hosts: HOSTS, enabled: false },
  ],
};

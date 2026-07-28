/**
 * douyin-miniapp-deploy 公共工具模块
 * 供 upload.js / audit.js 共用
 */
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const config = require('./config');

/**
 * 根据 config.js 的 appid 自动同步到项目 project.config.json
 * @param {Object} appConfig
 * @returns {{ original: string|null, synced: boolean }}
 */
function syncProjectAppid(appConfig) {
  const projectPath = config.PROJECT_PATHS[appConfig.type];
  const configFile = path.join(projectPath, 'project.config.json');

  if (!fs.existsSync(configFile)) {
    console.log(chalk.yellow(`  ⚠️  未找到 project.config.json: ${configFile}`));
    return { original: null, synced: false };
  }

  const raw = fs.readFileSync(configFile, 'utf-8');
  const projectConfig = JSON.parse(raw);
  const original = projectConfig.appid;

  if (projectConfig.appid === appConfig.appid) return { original, synced: false };

  projectConfig.appid = appConfig.appid;
  fs.writeFileSync(configFile, JSON.stringify(projectConfig, null, 4));
  console.log(chalk.gray(`  🔄 已同步 project.config.json appid: ${original} → ${appConfig.appid}`));
  return { original, synced: true };
}

/**
 * 还原 project.config.json 中的 appid
 * @param {Object} appConfig
 * @param {string|null} original
 */
function restoreProjectAppid(appConfig, original) {
  if (original === null) return;
  const projectPath = config.PROJECT_PATHS[appConfig.type];
  const configFile = path.join(projectPath, 'project.config.json');
  const raw = fs.readFileSync(configFile, 'utf-8');
  const projectConfig = JSON.parse(raw);
  if (projectConfig.appid !== original) {
    projectConfig.appid = original;
    fs.writeFileSync(configFile, JSON.stringify(projectConfig, null, 4));
  }
}

module.exports = { syncProjectAppid, restoreProjectAppid };

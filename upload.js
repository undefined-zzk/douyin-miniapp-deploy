/**
 * 上传模块 - 核心函数
 * 统一由 index.js 调用
 */
const fs = require('fs');
const tma = require('tt-ide-cli');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const dayjs = require('dayjs');
const config = require('./config');

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

/**
 * 上传单个小程序
 * @param {Object} appConfig
 * @param {string} version
 * @param {string} changeLog
 * @returns {Promise<Object>}
 */
async function uploadApp(appConfig, version, changeLog) {
  const projectPath = config.PROJECT_PATHS[appConfig.type];
  if (!projectPath) {
    console.error(chalk.red(`❌ 未找到 type="${appConfig.type}" 对应的项目路径`));
    return { success: false, appConfig, error: `未配置项目路径: type=${appConfig.type}` };
  }

  const { original } = syncProjectAppid(appConfig);
  const spinner = ora(`正在上传「${appConfig.name}」(${appConfig.appid})...`).start();

  try {
    const resolvedPath = path.resolve(projectPath);
    const uploadVersion = version || '1.0.0';
    const uploadChangeLog = changeLog || `[CI] ${dayjs().format('YYYY-MM-DD HH:mm:ss')} 自动上传`;

    const result = await tma.upload({
      project: { path: resolvedPath },
      qrcode: { format: 'null', output: '', options: { small: false } },
      copyToClipboard: false,
      changeLog: uploadChangeLog,
      version: uploadVersion,
      needUploadSourcemap: true,
    });

    spinner.succeed(chalk.green(`✅「${appConfig.name}」上传成功！`));
    console.log(chalk.gray(`   AppID: ${appConfig.appid}`));
    console.log(chalk.gray(`   项目路径: ${resolvedPath}`));
    console.log(chalk.gray(`   版本: ${uploadVersion}`));
    console.log(chalk.gray(`   更新日志: ${uploadChangeLog}`));

    return { success: true, appConfig, result };
  } catch (error) {
    spinner.fail(chalk.red(`❌「${appConfig.name}」上传失败`));
    console.error(chalk.red(`   错误信息: ${error.message}`));
    return { success: false, appConfig, error: error.message };
  } finally {
    restoreProjectAppid(appConfig, original);
  }
}

/**
 * 批量上传多个小程序（每个可独立指定版本号）
 * @param {Array<{ appConfig: Object, version: string, changeLog: string }>} items
 * @returns {Promise<Array>}
 */
async function batchUpload(items) {
  console.log(chalk.cyan.bold('\n📦 开始批量上传小程序代码\n'));
  console.log(chalk.gray(`共 ${items.length} 个小程序待上传\n`));

  const results = [];
  for (let i = 0; i < items.length; i++) {
    console.log(chalk.gray(`[${i + 1}/${items.length}]`));
    const result = await uploadApp(items[i].appConfig, items[i].version, items[i].changeLog);
    results.push(result);
    console.log('');
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(chalk.bold('═══════════════════════════════════════'));
  console.log(chalk.bold('📊 上传结果汇总'));
  console.log(chalk.bold('═══════════════════════════════════════'));
  console.log(chalk.green(`  成功: ${successCount} 个`));
  if (failCount > 0) {
    console.log(chalk.red(`  失败: ${failCount} 个`));
    results.filter(r => !r.success).forEach(r => {
      console.log(chalk.red(`    - ${r.appConfig.name}: ${r.error}`));
    });
  }
  console.log('');

  return results;
}

module.exports = { uploadApp, batchUpload };

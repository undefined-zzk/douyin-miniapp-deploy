/**
 * 提审模块 - 核心函数
 * 统一由 index.js 调用
 */
const fs = require('fs');
const tma = require('tt-ide-cli');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const config = require('./config');

/**
 * 根据 config.js 的 appid 自动同步到项目 project.config.json
 */
function syncProjectAppid(appConfig) {
  const projectPath = config.PROJECT_PATHS[appConfig.type];
  const configFile = path.join(projectPath, 'project.config.json');

  if (!fs.existsSync(configFile)) return { original: null, synced: false };

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
 * 提审单个小程序
 */
async function auditApp(appConfig, auditOptions = {}) {
  // 自动同步 appid 到 project.config.json
  const { original } = syncProjectAppid(appConfig);

  const spinner = ora(`正在提审「${appConfig.name}」(${appConfig.appid})...`).start();

  try {
    const hosts = auditOptions.hosts || appConfig.hosts || config.defaultHosts;
    const autoPublish = auditOptions.autoPublish !== undefined ? auditOptions.autoPublish : false;
    const defaultSsUrl = auditOptions.defaultSsUrl || undefined;

    const auditParams = {
      appid: appConfig.appid,
      host: hosts,
      autoPublish,
    };

    if (defaultSsUrl) {
      auditParams.defaultSsUrl = path.resolve(defaultSsUrl);
    }

    await tma.audit(auditParams);

    spinner.succeed(chalk.green(`✅「${appConfig.name}」提审成功！`));
    console.log(chalk.gray(`   AppID: ${appConfig.appid}`));
    console.log(chalk.gray(`   宿主应用: ${hosts.join(', ')}`));
    console.log(chalk.gray(`   自动发布: ${autoPublish ? '是' : '否'}`));
    if (defaultSsUrl) {
      console.log(chalk.gray(`   截图路径: ${defaultSsUrl}`));
    }

    return { success: true, appConfig };
  } catch (error) {
    spinner.fail(chalk.red(`❌「${appConfig.name}」提审失败`));
    console.error(chalk.red(`   错误信息: ${error.message}`));
    return { success: false, appConfig, error: error.message };
  } finally {
    restoreProjectAppid(appConfig, original);
  }
}

/**
 * 批量提审多个小程序
 */
async function batchAudit(appConfigs, auditOptions = {}) {
  console.log(chalk.cyan.bold('\n🔍 开始批量提审小程序\n'));
  console.log(chalk.gray(`共 ${appConfigs.length} 个小程序待提审\n`));

  const results = [];
  for (let i = 0; i < appConfigs.length; i++) {
    console.log(chalk.gray(`[${i + 1}/${appConfigs.length}]`));
    const result = await auditApp(appConfigs[i], auditOptions);
    results.push(result);
    console.log('');
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(chalk.bold('═══════════════════════════════════════'));
  console.log(chalk.bold('📊 提审结果汇总'));
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

module.exports = { auditApp, batchAudit };

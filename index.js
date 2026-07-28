/**
 * douyin-miniapp-deploy - 抖音小程序批量上传代码 & 提审工具
 *
 * 使用方式：
 *   npm start    # 进入交互式菜单
 *
 * 跳过不需要的小程序：
 *   编辑 config.js，将对应项的 enabled 设为 false
 */
const tma = require('tt-ide-cli');
const chalk = require('chalk');
const inquirer = require('inquirer');
const config = require('./config');
const { batchUpload } = require('./upload');
const { batchAudit } = require('./audit');

// 宿主应用中英文映射
const HOST_LABELS = {
  douyin: '抖音',
  douyin_lite: '抖音极速版',
  douyin_harmony: '抖音鸿蒙',
  douyin_lite_harmony: '抖音极速版鸿蒙',
  huoshan: '抖音火山版',
  toutiao: '今日头条',
  tt_lite: '今日头条极速版',
};

// ==================== 配置校验 ====================
function validateConfig() {
  const errors = [];
  const warnings = [];
  const { apps, TYPES, PROJECT_PATHS } = config;

  if (!apps || !Array.isArray(apps) || apps.length === 0) {
    errors.push('apps 列表为空，请至少配置一个小程序');
    return { errors, warnings };
  }

  const MAX_NO = 9999;
  const appidMap = new Map();

  apps.forEach((app, i) => {
    const name = app.name || '(未命名)';
    const prefix = `[${app.no != null ? app.no : '?'}]`;

    // 1. no 必须存在且为数字
    if (app.no == null || app.no === '') {
      errors.push(`${prefix}: no 不能为空，必须填写数字`);
    } else if (typeof app.no !== 'number' || !Number.isInteger(app.no)) {
      errors.push(`${prefix}: no 必须是整数，当前值: ${app.no}`);
    } else if (app.no < 1) {
      errors.push(`${prefix}: no 必须大于 0，当前值: ${app.no}`);
    } else if (app.no > MAX_NO) {
      errors.push(`${prefix}: no 不能超过 ${MAX_NO}，当前值: ${app.no}`);
    }

    // 2. type 必须存在
    if (!app.type) errors.push(`${prefix}: type 不能为空`);

    // 3. name / appid：enabled 为 true 时必填，enabled 为 false 时可留空（占位项）
    if (app.enabled !== false) {
      if (!app.name) errors.push(`${prefix}: name 不能为空`);
      if (!app.appid) errors.push(`${prefix}: appid 不能为空`);
    }

    // 3. type 必须在 TYPES 中定义
    if (app.type && TYPES && !TYPES[app.type]) {
      errors.push(`${prefix}: type="${app.type}" 未在 TYPES 中定义，可用类型: ${Object.keys(TYPES).join(', ')}`);
    }

    // 4. type 必须在 PROJECT_PATHS 中有对应路径
    if (app.type && PROJECT_PATHS && !PROJECT_PATHS[app.type]) {
      errors.push(`${prefix}: type="${app.type}" 未在 PROJECT_PATHS 中配置项目路径`);
    }

    // 5. appid 格式校验
    if (app.appid && !/^tt[a-z0-9]+$/i.test(app.appid)) {
      errors.push(`${prefix}: appid="${app.appid}" 格式不正确，应以 "tt" 开头`);
    }

    // 6. appid 重复检查
    if (app.appid) {
      if (appidMap.has(app.appid)) {
        errors.push(`${prefix}: appid="${app.appid}" 与 ${appidMap.get(app.appid)} 重复`);
      } else {
        appidMap.set(app.appid, prefix);
      }
    }

    // 7. hosts 校验
    if (app.hosts && (!Array.isArray(app.hosts) || app.hosts.length === 0)) {
      errors.push(`${prefix}: hosts 必须是非空数组`);
    }

    // 8. enabled 字段类型校验
    if (app.enabled !== undefined && typeof app.enabled !== 'boolean') {
      errors.push(`${prefix}: enabled 必须是 true 或 false`);
    }
  });

  return { errors, warnings };
}

// ==================== 获取已启用的小程序 ====================
function getEnabledApps() {
  return config.apps.filter(a => a.enabled !== false);
}

// ==================== 获取类型显示信息 ====================
function getTypeInfo(type) {
  if (config.TYPES && config.TYPES[type]) {
    return config.TYPES[type];
  }
  return { name: type, icon: '📁' };
}

function getTypeLabel(type) {
  const info = getTypeInfo(type);
  return `${info.icon} ${info.name}`;
}

// ==================== 显示 Banner ====================
function showBanner() {
  const typeList = Object.values(config.TYPES || {}).map(t => t.name).join(' / ');
  const title = typeList ? `🚀 抖音${typeList} 部署工具` : '🚀 抖音小程序批量部署工具';

  console.log('');
  console.log(chalk.cyan.bold('  ╔══════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('  ║                                          ║'));
  console.log(chalk.cyan.bold(`  ║    ${title.padEnd(24)}    ║`));
  console.log(chalk.cyan.bold('  ║       Upload & Audit Tool                ║'));
  console.log(chalk.cyan.bold('  ║                                          ║'));
  console.log(chalk.cyan.bold('  ╚══════════════════════════════════════════╝'));
  console.log('');
}

// ==================== 显示配置概览 ====================
function showConfigSummary() {
  const enabledApps = getEnabledApps();
  const disabledApps = config.apps.filter(a => a.enabled === false);

  console.log(chalk.gray('📋 已配置的小程序:\n'));

  if (enabledApps.length === 0) {
    console.log(chalk.yellow('  （没有已启用的小程序，请检查 config.js 中 enabled 字段）\n'));
  }

  // 按 type 分组展示
  const groups = {};
  for (const app of enabledApps) {
    if (!groups[app.type]) groups[app.type] = [];
    groups[app.type].push(app);
  }

  let index = 1;
  for (const [type, apps] of Object.entries(groups)) {
    console.log(chalk.cyan(`  ────────────────── ${getTypeLabel(type)} ──────────────────`));
    for (const app of apps) {
      const noStr = app.no ? `[${app.no}] ` : '';
      console.log(`  ${chalk.green(`${index++}.`)} ${chalk.bold(noStr + app.name)}  AppID: ${chalk.gray(app.appid)}`);
    }
  }

  if (disabledApps.length > 0) {
    console.log(chalk.gray(`\n  ⏸️  已跳过 ${disabledApps.length} 个（enabled: false）:`));
    disabledApps.forEach(app => {
      console.log(chalk.gray(`     - ${app.name} (${getTypeLabel(app.type)})`));
    });
  }
  console.log('');
}

// ==================== 登录态检测 ====================
async function checkLoginStatus() {
  try {
    const session = await tma.checkSession();
    if (session.isValid) {
      return { loggedIn: true, username: session.username };
    }
    return { loggedIn: false, errMsg: session.errMsg || '未登录' };
  } catch (error) {
    return { loggedIn: false, errMsg: error.message };
  }
}

async function ensureLoggedIn() {
  const status = await checkLoginStatus();

  if (status.loggedIn) {
    console.log(chalk.gray(`  ✅ 已登录 (${status.username})\n`));
    return true;
  }

  console.log(chalk.yellow(`  ⚠️  ${status.errMsg || '未检测到登录态'}，需要先登录\n`));

  const { doLogin } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'doLogin',
      message: '是否现在登录？',
      default: true,
    },
  ]);

  if (!doLogin) {
    return false;
  }

  // 调用 tma login 进行交互式登录
  const { execSync } = require('child_process');
  try {
    console.log(chalk.gray('\n正在打开登录流程，请按提示操作...\n'));
    execSync('npx tma login', { stdio: 'inherit', cwd: __dirname });
    // 再次检查
    const retryStatus = await checkLoginStatus();
    if (retryStatus.loggedIn) {
      console.log(chalk.green(`\n  ✅ 登录成功 (${retryStatus.username})\n`));
      return true;
    }
    console.log(chalk.red('\n  ❌ 登录失败，请重试\n'));
    return false;
  } catch {
    console.log(chalk.red('\n  ❌ 登录失败，请重试\n'));
    return false;
  }
}

// ==================== 交互式主菜单 ====================
async function mainMenu() {
  showBanner();

  // 配置校验
  const { errors, warnings } = validateConfig();
  if (errors.length > 0) {
    console.log(chalk.red.bold('❌ 配置错误，请修改 config.js 后重试：\n'));
    errors.forEach(e => console.log(chalk.red(`   ✗ ${e}`)));
    console.log('');
    process.exit(1);
  }
  if (warnings.length > 0) {
    console.log(chalk.yellow.bold('⚠️  配置警告：\n'));
    warnings.forEach(w => console.log(chalk.yellow(`   ! ${w}`)));
    console.log('');
  }

  showConfigSummary();

  const enabledApps = getEnabledApps();
  if (enabledApps.length === 0) {
    console.log(chalk.yellow('没有已启用的小程序，无法继续。请编辑 config.js。\n'));
    process.exit(0);
  }

  // 自动检测登录态
  const loggedIn = await ensureLoggedIn();
  if (!loggedIn) {
    console.log(chalk.yellow('未登录，无法继续。\n'));
    process.exit(0);
  }

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '请选择要执行的操作：',
      choices: [
        { name: '📦 上传代码', value: 'upload' },
        { name: '🔍 提交审核', value: 'audit' },
        { name: '🚀 一键上传+提审', value: 'all' },
        { name: '❌ 退出', value: 'exit' },
      ],
    },
  ]);

  switch (action) {
    case 'upload':
      await uploadFlow();
      break;
    case 'audit':
      await auditFlow();
      break;
    case 'all':
      await oneClickDeploy();
      break;
    case 'exit':
      console.log(chalk.gray('\n👋 再见！\n'));
      process.exit(0);
  }

  const { again } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'again',
      message: '是否返回主菜单？',
      default: true,
    },
  ]);

  if (again) {
    await mainMenu();
  } else {
    console.log(chalk.gray('\n👋 再见！\n'));
    process.exit(0);
  }
}

// ==================== 选择目标小程序 ====================
async function selectTargets() {
  const enabledApps = getEnabledApps();

  // 按 type 分组（动态读取 TYPES）
  const groups = {};
  for (const app of enabledApps) {
    const label = getTypeLabel(app.type);
    if (!groups[label]) groups[label] = [];
    groups[label].push(app);
  }

  const choices = [];
  for (const [groupLabel, apps] of Object.entries(groups)) {
    choices.push(new inquirer.Separator(`── ${groupLabel} ──`));
    for (const app of apps) {
      const noStr = app.no ? `[${app.no}] ` : '';
      choices.push({ name: `   ${noStr}${app.name}`, value: app });
    }
    // 每个分组下添加"全选本组"
    if (apps.length > 1) {
      const typeName = apps[0].type;
      const typeInfo = getTypeInfo(typeName);
      choices.push({ name: `   📚 全部${typeInfo.name}`, value: { groupSelect: groupLabel, apps } });
    }
  }

  if (enabledApps.length > 1) {
    choices.push(new inquirer.Separator());
    choices.push({ name: '📚 全部小程序', value: 'all' });
  }

  const { targets } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'targets',
      message: '请选择目标小程序（空格勾选，回车确认）：',
      choices,
      validate: (input) => input.length > 0 ? true : '请至少选择一个小程序',
    },
  ]);

  // 处理"全选本组"和"全部小程序"
  if (targets.includes('all')) {
    return [...enabledApps];
  }

  const result = [];
  for (const item of targets) {
    if (item && item.groupSelect) {
      for (const app of item.apps) {
        if (!result.find(r => r.appid === app.appid)) {
          result.push(app);
        }
      }
    } else {
      if (!result.find(r => r.appid === item.appid)) {
        result.push(item);
      }
    }
  }
  return result;
}

// ==================== 构建 hosts 选项列表 ====================
function buildHostChoices() {
  return config.defaultHosts.map(h => ({
    name: HOST_LABELS[h] || h,
    value: h,
    checked: true,
  }));
}

// ==================== 获取建议版本号 ====================
async function getSuggestedVersion(appConfig) {
  try {
    const meta = await tma.getMeta({ appid: appConfig.appid });
    const currentVersion = meta.version || '0.0.0';
    const parts = currentVersion.split('.').map(Number);
    parts[2] += 1;
    return parts.join('.');
  } catch {
    return '1.0.0';
  }
}

// ==================== 按类型收集版本号 ====================
async function collectVersions(targets) {
  const typeGroups = {};
  for (const app of targets) {
    if (!typeGroups[app.type]) typeGroups[app.type] = [];
    typeGroups[app.type].push(app);
  }

  const prompts = [];
  for (const [type, apps] of Object.entries(typeGroups)) {
    const label = getTypeLabel(type);
    const sampleApp = apps[0];
    const suggested = await getSuggestedVersion(sampleApp);
    const appNames = apps.map(a => a.name).join('、');

    prompts.push({
      type: 'input',
      name: `version_${type}`,
      message: `请输入${label}上传版本号（${appNames}）：`,
      default: suggested,
      validate: (input) => /^\d+\.\d+\.\d+$/.test(input) ? true : '版本号格式错误，请输入如 1.0.0',
    });
  }

  prompts.push({
    type: 'input',
    name: 'changeLog',
    message: '请输入更新日志：',
    default: `[CI] 自动上传于 ${new Date().toLocaleString('zh-CN')}`,
  });

  const answers = await inquirer.prompt(prompts);

  const items = [];
  for (const app of targets) {
    items.push({
      appConfig: app,
      version: answers[`version_${app.type}`],
      changeLog: answers.changeLog,
    });
  }
  return items;
}

// ==================== 上传流程 ====================
async function uploadFlow() {
  const targets = await selectTargets();
  const items = await collectVersions(targets);

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `确认上传「${targets.map(t => t.name).join('、')}」代码？`,
      default: true,
    },
  ]);

  if (!confirm) {
    console.log(chalk.yellow('已取消上传'));
    return;
  }

  await batchUpload(items);
}

// ==================== 提审流程 ====================
async function auditFlow() {
  const targets = await selectTargets();

  const { hosts, autoPublish, defaultSsUrl } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'hosts',
      message: '请选择提审的宿主应用：',
      choices: buildHostChoices(),
      validate: (input) => input.length > 0 ? true : '请至少选择一个宿主应用',
    },
    {
      type: 'confirm',
      name: 'autoPublish',
      message: '审核通过后是否自动发布？',
      default: false,
    },
    {
      type: 'input',
      name: 'defaultSsUrl',
      message: '首次提审截图路径（非首次可留空）：',
      default: '',
    },
  ]);

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `确认对「${targets.map(t => t.name).join('、')}」提交审核？`,
      default: true,
    },
  ]);

  if (!confirm) {
    console.log(chalk.yellow('已取消提审'));
    return;
  }

  const auditOptions = { hosts, autoPublish };
  if (defaultSsUrl) auditOptions.defaultSsUrl = defaultSsUrl;

  await batchAudit(targets, auditOptions);
}

// ==================== 一键上传+提审 ====================
async function oneClickDeploy() {
  const targets = await selectTargets();
  const items = await collectVersions(targets);

  const answers = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'hosts',
      message: '请选择提审的宿主应用：',
      choices: buildHostChoices(),
      validate: (input) => input.length > 0 ? true : '请至少选择一个宿主应用',
    },
    {
      type: 'confirm',
      name: 'autoPublish',
      message: '审核通过后是否自动发布？',
      default: false,
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: `确认对「${targets.map(t => t.name).join('、')}」执行「上传代码 → 提审」？`,
      default: true,
    },
  ]);

  if (!answers.confirm) {
    console.log(chalk.yellow('已取消操作'));
    return;
  }

  // 第一步：上传代码
  console.log(chalk.cyan.bold('\n═══════════════════════════════════════'));
  console.log(chalk.cyan.bold('  📦 第一步：上传代码'));
  console.log(chalk.cyan.bold('═══════════════════════════════════════\n'));

  const uploadResults = await batchUpload(items);

  const successUploads = uploadResults.filter(r => r.success);
  const failedUploads = uploadResults.filter(r => !r.success);

  if (successUploads.length === 0) {
    console.log(chalk.red('所有小程序上传失败，跳过提审步骤'));
    return;
  }

  if (failedUploads.length > 0) {
    console.log(chalk.yellow(`⚠️  ${failedUploads.length} 个上传失败，将跳过提审\n`));
  }

  // 第二步：提审
  console.log(chalk.cyan.bold('═══════════════════════════════════════'));
  console.log(chalk.cyan.bold('  🔍 第二步：提交审核'));
  console.log(chalk.cyan.bold('═══════════════════════════════════════\n'));

  await batchAudit(successUploads.map(r => r.appConfig), {
    hosts: answers.hosts,
    autoPublish: answers.autoPublish,
  });

  console.log(chalk.green.bold('🎉 一键部署流程完成！\n'));
}

// ==================== ESC 全局退出 ====================
const readline = require('readline');

function setupEscExit() {
  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.on('keypress', (str, key) => {
      if (key.name === 'escape') {
        console.log(chalk.gray('\n\n👋 已按 ESC 退出\n'));
        process.exit(0);
      }
    });
  }
}

// ==================== 入口 ====================
setupEscExit();

mainMenu().catch((err) => {
  console.error(chalk.red(`\n❌ 发生错误: ${err.message}`));
  process.exit(1);
});

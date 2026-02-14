#!/usr/bin/env node

/**
 * Release Script - 统一管理多包版本和 changelog
 *
 * 功能:
 * 1. 统一更新三个 package.json 的版本号
 * 2. 为 src 和 webview-ui 生成 changelog
 * 3. 合并生成根目录总 changelog
 * 4. 创建 git commit 和 tag
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// 配置常量
const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, "src");
const WEBVIEW_DIR = path.join(ROOT_DIR, "webview-ui");

// 日志颜色
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(message) {
  log(`\n✅ ${message}`, "green");
}

function logError(message) {
  log(`❌ ${message}`, "red");
  process.exit(1);
}

// 1. 验证 git 状态
function validateGitStatus(isDryRun = false) {
  log("🔍 检查 git 状态...");

  // 检查是否有未提交的变更
  const status = execSync("git status --porcelain", {
    encoding: "utf8",
  }).trim();

  if (status && !isDryRun) {
    logError("存在未提交的变更，请先提交或暂存");
  }

  // 检查是否在正确的分支
  const branch = execSync("git branch --show-current", {
    encoding: "utf8",
  }).trim();
  log(`当前分支: ${branch}`, "cyan");

  if (status && isDryRun) {
    log(
      `⚠️  注意: 存在未提交的变更 (${status.split("\n").length} 个文件)`,
      "yellow",
    );
  }
}

// 2. 获取新版本号
function getNewVersion() {
  log("📦 获取新版本号...");

  try {
    const currentVersion = getCurrentVersion(ROOT_DIR);
    const commitsSinceLastTag = getCommitsSinceLastTag();

    if (commitsSinceLastTag.length === 0) {
      log("⚠️  最新 tag 之后没有新提交，跳过 release", "yellow");
      return null;
    }

    const commitType = getCommitType(commitsSinceLastTag);
    log(`检测到变更类型: ${commitType}`, "cyan");

    // 使用 standard-version 预览版本号
    const output = execSync(
      "npx standard-version --dry-run --skip.tag --skip.commit",
      {
        cwd: ROOT_DIR,
        encoding: "utf8",
        stdio: "pipe",
      },
    );

    // 从输出中解析版本号
    const match = output.match(
      /bumping version in package\.json from (\d+\.\d+\.\d+) to (\d+\.\d+\.\d+)/,
    );
    if (!match) {
      // 如果没有版本变更，按 commit 类型手动计算版本号
      const newVersion = bumpVersion(currentVersion, commitType);
      log(`当前版本: ${currentVersion} → 新版本: ${newVersion}`, "yellow");
      return newVersion;
    }

    const stdCurrentVersion = match[1];
    const stdNewVersion = match[2];
    const standardBumpType = inferBumpType(stdCurrentVersion, stdNewVersion);
    const resolvedBumpType = pickHigherBump(commitType, standardBumpType);
    const newVersion =
      resolvedBumpType === standardBumpType
        ? stdNewVersion
        : bumpVersion(currentVersion, resolvedBumpType);

    if (resolvedBumpType !== standardBumpType) {
      log(
        `⚠️  standard-version 检测为 ${standardBumpType}，已按 commit 修正为 ${resolvedBumpType}`,
        "yellow",
      );
    }

    log(`当前版本: ${currentVersion} → 新版本: ${newVersion}`, "yellow");
    return newVersion;
  } catch (error) {
    logError(`获取版本号失败: ${error.message}`);
  }
}

// 获取当前版本号
function getCurrentVersion(dir) {
  const pkgPath = path.join(dir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  return pkg.version;
}

function getLastTag() {
  try {
    return execSync("git describe --tags --abbrev=0", {
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

function getCommitsSinceLastTag() {
  const lastTag = getLastTag();
  const range = lastTag ? `${lastTag}..HEAD` : "";
  const cmd = lastTag
    ? `git log ${range} --pretty=format:%s`
    : "git log --pretty=format:%s -n 100";

  const commits = execSync(cmd, { encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // 忽略 release 自身提交，避免重复 bump patch
  return commits.filter(
    (msg) => !msg.match(/^(🚀\s+)?chore\(release\):\s*v\d+\.\d+\.\d+$/),
  );
}

// 获取提交类型
function getCommitType(commits = []) {
  const text = Array.isArray(commits) ? commits.join("\n") : String(commits);

  if (
    /BREAKING[\s_-]CHANGES?/i.test(text) ||
    /(^|\s)\w+(\([^)]+\))?!:\s*/m.test(text)
  ) {
    return "major";
  }

  if (/^\s*✨/m.test(text) || /(^|\s)feat(\([^)]+\))?:\s*/m.test(text)) {
    return "minor";
  }

  if (/^\s*🐛/m.test(text) || /(^|\s)fix(\([^)]+\))?:\s*/m.test(text)) {
    return "patch";
  }

  // 其他类型（refactor/chore/docs 等）默认按 patch 处理
  return "patch";
}

function inferBumpType(currentVersion, newVersion) {
  const [currentMajor, currentMinor, currentPatch] = currentVersion
    .split(".")
    .map(Number);
  const [newMajor, newMinor, newPatch] = newVersion.split(".").map(Number);

  if (newMajor > currentMajor) return "major";
  if (newMinor > currentMinor) return "minor";
  if (newPatch > currentPatch) return "patch";
  return "patch";
}

function pickHigherBump(left, right) {
  const rank = { patch: 1, minor: 2, major: 3 };
  return rank[left] >= rank[right] ? left : right;
}

// 版本号递增
function bumpVersion(version, type) {
  const [major, minor, patch] = version.split(".").map(Number);

  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

// 3. 同步版本号
function syncVersions(version) {
  logStep("同步版本号");

  // 更新根目录
  updatePackageJson(ROOT_DIR, version);
  log(`   - 根目录: ${version}`, "cyan");

  // 更新 src
  updatePackageJson(SRC_DIR, version);
  log(`   - src: ${version}`, "cyan");

  // 更新 webview-ui
  updatePackageJson(WEBVIEW_DIR, version);
  log(`   - webview-ui: ${version}`, "cyan");
}

// 更新 package.json 版本
function updatePackageJson(dir, version) {
  const pkgPath = path.join(dir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
}

// Emoji 到 changelog 类型的映射
const EMOJI_TO_TYPE = {
  "✨": "✨ Features",
  "🎉": "🎉 Init",
  "🐛": "🐛 Bug Fixes",
  "♻️": "♻️ Code Refactoring",
  "🔧": "🔧 Chores",
  "🚀": "🚀 Chore",
  "📝": "📝 Documentation",
  "💄": "💄 Styles",
  "⚡": "⚡ Performance Improvements",
  "✅": "✅ Tests",
  "👷": "👷 Continuous Integration",
  "📦": "📦 Build System",
  "⏪": "⏪ Revert",
};

// 文字类型到 changelog 类型的映射（兼容旧格式）
const TEXT_TO_TYPE = {
  feat: "✨ Features",
  fix: "🐛 Bug Fixes",
  init: "🎉 Init",
  docs: "📝 Documentation",
  style: "💄 Styles",
  refactor: "♻️ Code Refactoring",
  perf: "⚡ Performance Improvements",
  test: "✅ Tests",
  revert: "⏪ Revert",
  build: "📦 Build System",
  chore: "🔧 Chores",
  ci: "👷 Continuous Integration",
};

/**
 * 从 commit message 中提取类型和描述
 */
function parseCommitMessage(message) {
  // 匹配 emoji + 文字混合格式: 🔧 chore(scope): description
  const mixedMatch = message.match(/^(\S+)\s+(\w+)\(([^)]+)\):\s*(.+)$/);
  if (mixedMatch) {
    const [, emoji, textType, scope, description] = mixedMatch;
    // 优先使用 emoji 作为类型
    return { type: emoji, scope, description };
  }

  // 匹配 emoji 格式: ♻️ scope: description
  const emojiMatch = message.match(/^(\S+)\s+([\w-]+):\s*(.+)$/);
  if (emojiMatch) {
    const [, emoji, scope, description] = emojiMatch;
    return { type: emoji, scope, description };
  }

  // 匹配 emoji 格式（无 scope）: ♻️ description
  const emojiNoScopeMatch = message.match(/^(\S+)\s+(.+)$/);
  if (emojiNoScopeMatch) {
    const [, emoji, description] = emojiNoScopeMatch;
    // 检查 description 是否以 scope: 开头
    const scopeMatch = description.match(/^([\w-]+):\s*(.+)$/);
    if (scopeMatch) {
      return { type: emoji, scope: scopeMatch[1], description: scopeMatch[2] };
    }
    return { type: emoji, scope: "", description };
  }

  // 匹配文字格式: refactor(scope): description
  const textMatch = message.match(/^(\w+)(\([^)]+\))?:\s*(.+)$/);
  if (textMatch) {
    const [, type, scopeRaw, description] = textMatch;
    const scope = scopeRaw ? scopeRaw.slice(1, -1) : "";
    return { type, scope, description };
  }

  // 无法解析，返回原始消息
  return { type: "chore", scope: "", description: message };
}

/**
 * 获取 changelog 类型名称
 */
function getChangelogType(emojiOrType) {
  return EMOJI_TO_TYPE[emojiOrType] || TEXT_TO_TYPE[emojiOrType] || "🔧 Chores";
}

/**
 * 生成单个包的 changelog
 */
function generateChangelogForPackage(packageDir, packageName, version) {
  const changelogPath = path.join(packageDir, "CHANGELOG.zh-CN.md");

  // 获取自上次版本以来的提交
  const lastVersion = getPreviousVersion(packageDir);
  const gitRange = lastVersion ? `v${lastVersion}..HEAD` : "HEAD~10..HEAD";

  let gitLogCmd;
  if (lastVersion) {
    gitLogCmd = `git log ${gitRange} --pretty=format:"%h|%an|%s|%ad" --date=short`;
  } else {
    gitLogCmd = `git log -10 --pretty=format:"%h|%an|%s|%ad" --date=short`;
  }

  try {
    const gitLog = execSync(gitLogCmd, {
      cwd: packageDir,
      encoding: "utf8",
    }).trim();

    if (!gitLog) {
      log(`   - ${packageName}: 无新提交`, "cyan");
      return;
    }

    // 解析并分类提交
    const commitsByType = {};
    const lines = gitLog.split("\n").filter((line) => line.trim());

    lines.forEach((line) => {
      const [hash, , message] = line.split("|"); // 忽略 author 和 date
      const { type, scope, description } = parseCommitMessage(message);
      const changelogType = getChangelogType(type);

      if (!commitsByType[changelogType]) {
        commitsByType[changelogType] = [];
      }

      const repoUrl = "https://github.com/littleCareless/dish-ai-commit";
      const commitLink = `([${hash}](${repoUrl}/commit/${hash}))`;
      const scopePrefix = scope ? `**${scope}**: ` : "";
      commitsByType[changelogType].push(
        `- ${scopePrefix}${description} ${commitLink}`,
      );
    });

    // 生成 changelog 内容
    let changelogContent = "";

    // 如果文件不存在，添加头部
    if (!fs.existsSync(changelogPath)) {
      changelogContent = `# Changelog\n\n[English](CHANGELOG.md) | [简体中文](CHANGELOG.zh-CN.md)\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。\n\n`;
    }

    // 添加版本部分
    const today = new Date().toISOString().split("T")[0];
    changelogContent += `## ${version} (${today})\n\n`;

    // 按类型顺序添加提交
    const typeOrder = [
      "✨ Features",
      "🐛 Bug Fixes",
      "♻️ Code Refactoring",
      "⚡ Performance Improvements",
      "📝 Documentation",
      "🔧 Chores",
      "👷 Continuous Integration",
      "📦 Build System",
      "🎉 Init",
      "💄 Styles",
      "✅ Tests",
      "⏪ Revert",
    ];

    typeOrder.forEach((type) => {
      if (commitsByType[type] && commitsByType[type].length > 0) {
        changelogContent += `### ${type}\n\n`;
        commitsByType[type].forEach((commit) => {
          changelogContent += `${commit}\n`;
        });
        changelogContent += "\n";
      }
    });

    // 写入文件
    fs.writeFileSync(changelogPath, changelogContent);
    log(`   - ${packageName} ✓`, "cyan");
  } catch (error) {
    log(`   ⚠️  ${packageName} 生成警告: ${error.message}`, "yellow");
  }
}

/**
 * 获取上一个版本号
 */
function getPreviousVersion(packageDir) {
  try {
    const tags = execSync("git tag --sort=-version:refname", {
      cwd: packageDir,
      encoding: "utf8",
    })
      .trim()
      .split("\n");

    const versionTags = tags.filter((tag) => tag.match(/^v\d+\.\d+\.\d+$/));
    return versionTags.length > 1 ? versionTags[1].replace("v", "") : null;
  } catch {
    return null;
  }
}

// 4. 生成各包 changelog
function generateChangelogs() {
  logStep("生成 changelog");

  // 读取当前版本号
  const version = getCurrentVersion(ROOT_DIR);

  // 为 src 生成
  generateChangelogForPackage(SRC_DIR, "src", version);

  // 为 webview-ui 生成
  generateChangelogForPackage(WEBVIEW_DIR, "webview-ui", version);
}

// 5. 合并根目录 changelog
function mergeRootChangelog(version) {
  logStep("合并根目录 changelog");

  try {
    const rootChangelogPath = path.join(ROOT_DIR, "CHANGELOG.zh-CN.md");

    // 为根目录生成 changelog（包含所有提交）
    generateRootChangelog(version);

    // 读取各包的最新变更
    const srcChangelog = readLatestChangelog(
      path.join(SRC_DIR, "CHANGELOG.zh-CN.md"),
    );
    const webviewChangelog = readLatestChangelog(
      path.join(WEBVIEW_DIR, "CHANGELOG.zh-CN.md"),
    );

    // 如果有子包变更，添加到根目录
    if (srcChangelog || webviewChangelog) {
      const content = fs.readFileSync(rootChangelogPath, "utf8");

      // 找到版本头部位置
      const versionHeader = `## ${version}`;
      const versionIndex = content.indexOf(versionHeader);

      if (versionIndex !== -1) {
        // 在版本头部后插入子包变更
        const insertPoint = content.indexOf("\n", versionIndex) + 1;
        const before = content.substring(0, insertPoint);
        const after = content.substring(insertPoint);

        let mergedContent = before;

        if (srcChangelog) {
          mergedContent += `\n### 📦 src 模块\n${srcChangelog}\n`;
        }

        if (webviewChangelog) {
          mergedContent += `\n### 🖥️ webview-ui 模块\n${webviewChangelog}\n`;
        }

        mergedContent += after;

        fs.writeFileSync(rootChangelogPath, mergedContent);
        log("   - 根目录 CHANGELOG.zh-CN.md 已合并 ✓", "cyan");
      }
    } else {
      log("   - 无需合并子包变更", "cyan");
    }
  } catch (error) {
    log(`   ⚠️  合并警告: ${error.message}`, "yellow");
  }
}

/**
 * 为根目录生成 changelog
 */
function generateRootChangelog(version) {
  const changelogPath = path.join(ROOT_DIR, "CHANGELOG.zh-CN.md");

  // 获取自上次版本以来的提交
  const lastVersion = getPreviousVersion(ROOT_DIR);
  const gitRange = lastVersion ? `v${lastVersion}..HEAD` : "HEAD~10..HEAD";

  let gitLogCmd;
  if (lastVersion) {
    gitLogCmd = `git log ${gitRange} --pretty=format:"%h|%an|%s|%ad" --date=short`;
  } else {
    gitLogCmd = `git log -10 --pretty=format:"%h|%an|%s|%ad" --date=short`;
  }

  try {
    const gitLog = execSync(gitLogCmd, {
      cwd: ROOT_DIR,
      encoding: "utf8",
    }).trim();

    if (!gitLog) {
      log("   - 根目录: 无新提交", "cyan");
      return;
    }

    // 解析并分类提交
    const commitsByType = {};
    const lines = gitLog.split("\n").filter((line) => line.trim());

    lines.forEach((line) => {
      const [hash, , message] = line.split("|"); // 忽略 author 和 date
      const { type, scope, description } = parseCommitMessage(message);
      const changelogType = getChangelogType(type);

      if (!commitsByType[changelogType]) {
        commitsByType[changelogType] = [];
      }

      const repoUrl = "https://github.com/littleCareless/dish-ai-commit";
      const commitLink = `([${hash}](${repoUrl}/commit/${hash}))`;
      const scopePrefix = scope ? `**${scope}**: ` : "";
      commitsByType[changelogType].push(
        `- ${scopePrefix}${description} ${commitLink}`,
      );
    });

    // 生成 changelog 内容
    let changelogContent = "";

    // 如果文件不存在，添加头部
    if (!fs.existsSync(changelogPath)) {
      changelogContent = `# Changelog\n\n[English](CHANGELOG.md) | [简体中文](CHANGELOG.zh-CN.md)\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。\n\n`;
    }

    // 添加版本部分
    const today = new Date().toISOString().split("T")[0];
    changelogContent += `## ${version} (${today})\n\n`;

    // 按类型顺序添加提交
    const typeOrder = [
      "✨ Features",
      "🐛 Bug Fixes",
      "♻️ Code Refactoring",
      "⚡ Performance Improvements",
      "📝 Documentation",
      "🔧 Chores",
      "👷 Continuous Integration",
      "📦 Build System",
      "🎉 Init",
      "💄 Styles",
      "✅ Tests",
      "⏪ Revert",
    ];

    typeOrder.forEach((type) => {
      if (commitsByType[type] && commitsByType[type].length > 0) {
        changelogContent += `### ${type}\n\n`;
        commitsByType[type].forEach((commit) => {
          changelogContent += `${commit}\n`;
        });
        changelogContent += "\n";
      }
    });

    // 写入文件
    fs.writeFileSync(changelogPath, changelogContent);
    log("   - 根目录 CHANGELOG.zh-CN.md ✓", "cyan");
  } catch (error) {
    log(`   ⚠️  根目录生成警告: ${error.message}`, "yellow");
  }
}

// 读取最新的 changelog 变更
function readLatestChangelog(changelogPath) {
  if (!fs.existsSync(changelogPath)) {
    return "";
  }

  const content = fs.readFileSync(changelogPath, "utf8");
  const lines = content.split("\n");

  // 找到第一个版本号
  let versionStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^##? \d+\.\d+\.\d+/)) {
      versionStart = i;
      break;
    }
  }

  if (versionStart === -1) return "";

  // 找到下一个版本号或文件结尾
  let versionEnd = lines.length;
  for (let i = versionStart + 1; i < lines.length; i++) {
    if (lines[i].match(/^##? \d+\.\d+\.\d+/)) {
      versionEnd = i;
      break;
    }
  }

  // 提取该版本的内容
  const versionContent = lines
    .slice(versionStart + 1, versionEnd)
    .join("\n")
    .trim();
  return versionContent;
}

// 6. 创建 git 提交和标签
function createGitCommit(version) {
  logStep("创建 git 提交和标签");

  // git add
  execSync("git add .");
  log("   - git add . ✓", "cyan");

  // git commit
  const commitMessage = `chore(release): v${version}`;
  execSync(`git commit -m "${commitMessage}"`);
  log(`   - commit: ${commitMessage} ✓`, "cyan");

  // git tag
  execSync(`git tag v${version}`);
  log(`   - tag: v${version} ✓`, "cyan");
}

// 显示帮助信息
function showHelp() {
  console.log(`
🚀 Release Script - 统一管理多包版本和 changelog

使用方法:
  node release.js [选项]

选项:
  --dry-run, -d    预览模式，不执行实际修改
  --help, -h       显示帮助信息

示例:
  node release.js           # 正常执行 release
  node release.js --dry-run # 预览将要执行的变更
  node release.js -d        # 同上

功能:
  1. 统一更新三个 package.json 的版本号
  2. 为 src 和 webview-ui 生成 changelog
  3. 合并生成根目录总 changelog
  4. 创建 git commit 和 tag
`);
  process.exit(0);
}

// 主函数
function main() {
  // 检查帮助
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    showHelp();
  }

  // 检查是否为 dry-run 模式
  const isDryRun =
    process.argv.includes("--dry-run") || process.argv.includes("-d");

  try {
    log("🚀 开始 Release 流程...", "blue");

    if (isDryRun) {
      log("⚠️  DRY RUN 模式 - 不会执行实际修改", "yellow");
    }

    // 1. 验证环境
    validateGitStatus(isDryRun);

    // 2. 获取新版本号
    const newVersion = getNewVersion();

    if (!newVersion) {
      log("ℹ️  没有可发布的新变更，流程结束", "cyan");
      return;
    }

    const currentVersion = getCurrentVersion(ROOT_DIR);

    if (isDryRun) {
      log("\n📋 DRY RUN 预览:", "cyan");
      log(`   - 新版本号: ${newVersion}`, "cyan");
      log(`   - 将更新文件:`, "cyan");
      log(`     • package.json (${currentVersion} → ${newVersion})`, "cyan");
      log(
        `     • src/package.json (${currentVersion} → ${newVersion})`,
        "cyan",
      );
      log(
        `     • webview-ui/package.json (${currentVersion} → ${newVersion})`,
        "cyan",
      );
      log(`     • src/CHANGELOG.zh-CN.md`, "cyan");
      log(`     • webview-ui/CHANGELOG.zh-CN.md`, "cyan");
      log(`     • CHANGELOG.zh-CN.md (合并)`, "cyan");
      log(`     • git commit: chore(release): v${newVersion}`, "cyan");
      log(`     • git tag: v${newVersion}`, "cyan");
      log("\n✅ DRY RUN 完成 - 未执行任何修改", "green");
      return;
    }

    // 确认
    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question(`\n确认发布版本 ${newVersion}? (y/N) `, (answer) => {
      if (answer.toLowerCase() !== "y") {
        log("已取消发布", "yellow");
        process.exit(0);
      }

      readline.close();

      // 3. 同步版本号
      syncVersions(newVersion);

      // 4. 生成各包 changelog
      generateChangelogs();

      // 5. 合并根目录 changelog
      mergeRootChangelog(newVersion);

      // 6. 创建 git 提交和标签
      createGitCommit(newVersion);

      log("\n🎉 Release 完成！", "green");
      log(`\n💡 下一步: git push --follow-tags`, "cyan");
      log(
        `   或: git push origin main && git push origin v${newVersion}`,
        "cyan",
      );
    });
  } catch (error) {
    logError(`Release 失败: ${error.message}`);
  }
}

// 运行
if (require.main === module) {
  main();
}

module.exports = {
  getNewVersion,
  syncVersions,
  generateChangelogs,
  mergeRootChangelog,
  createGitCommit,
};

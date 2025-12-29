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
function validateGitStatus() {
  log("🔍 检查 git 状态...");

  // 检查是否有未提交的变更
  const status = execSync("git status --porcelain", {
    encoding: "utf8",
  }).trim();
  if (status) {
    logError("存在未提交的变更，请先提交或暂存");
  }

  // 检查是否在正确的分支
  const branch = execSync("git branch --show-current", {
    encoding: "utf8",
  }).trim();
  log(`当前分支: ${branch}`, "cyan");
}

// 2. 获取新版本号
function getNewVersion() {
  log("📦 获取新版本号...");

  try {
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
      // 如果没有版本变更，尝试从 commit 获取类型
      const commitType = getCommitType();
      log(`检测到变更类型: ${commitType}`, "cyan");

      // 手动计算版本号
      const currentVersion = getCurrentVersion(ROOT_DIR);
      const newVersion = bumpVersion(currentVersion, commitType);
      log(`当前版本: ${currentVersion} → 新版本: ${newVersion}`, "yellow");
      return newVersion;
    }

    const currentVersion = match[1];
    const newVersion = match[2];
    log(`当前版本: ${currentVersion} → 新版本: ${newVersion}`, "yellow");
    return newVersion;
  } catch (error) {
    logError(`获取版本号失败: ${error.message}`);
  }
}

// 获取当前版本号
function getCurrentVersion(dir) {
  const pkgPath = path.join(dir, "package.json");
  const pkg = fs.readJsonSync(pkgPath);
  return pkg.version;
}

// 获取提交类型
function getCommitType() {
  const commits = execSync("git log --oneline -n 10", {
    encoding: "utf8",
  }).trim();

  if (commits.includes("feat:") || commits.includes("✨")) return "minor";
  if (commits.includes("fix:") || commits.includes("🐛")) return "patch";
  if (commits.includes("BREAKING")) return "major";

  return "patch"; // 默认为 patch
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

// 4. 生成各包 changelog
function generateChangelogs() {
  logStep("生成 changelog");

  // 为 src 生成
  try {
    execSync("npx standard-version --skip.bump --skip.tag --skip.commit", {
      cwd: SRC_DIR,
      stdio: "pipe",
    });
    log("   - src/CHANGELOG.zh-CN.md ✓", "cyan");
  } catch (error) {
    log(`   ⚠️  src changelog 生成警告: ${error.message}`, "yellow");
  }

  // 为 webview-ui 生成
  try {
    execSync("npx standard-version --skip.bump --skip.tag --skip.commit", {
      cwd: WEBVIEW_DIR,
      stdio: "pipe",
    });
    log("   - webview-ui/CHANGELOG.zh-CN.md ✓", "cyan");
  } catch (error) {
    log(`   ⚠️  webview-ui changelog 生成警告: ${error.message}`, "yellow");
  }
}

// 5. 合并根目录 changelog
function mergeRootChangelog(version) {
  logStep("合并根目录 changelog");

  try {
    // 先为根目录生成基础 changelog
    execSync("npx standard-version --skip.bump --skip.tag --skip.commit", {
      cwd: ROOT_DIR,
      stdio: "pipe",
    });

    // 读取各包的最新变更
    const srcChangelog = readLatestChangelog(
      path.join(SRC_DIR, "CHANGELOG.zh-CN.md"),
    );
    const webviewChangelog = readLatestChangelog(
      path.join(WEBVIEW_DIR, "CHANGELOG.zh-CN.md"),
    );

    // 如果有子包变更，添加到根目录
    if (srcChangelog || webviewChangelog) {
      const rootChangelogPath = path.join(ROOT_DIR, "CHANGELOG.zh-CN.md");
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

// 主函数
function main() {
  // 检查是否为 dry-run 模式
  const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');

  try {
    log("🚀 开始 Release 流程...", "blue");

    if (isDryRun) {
      log("⚠️  DRY RUN 模式 - 不会执行实际修改", "yellow");
    }

    // 1. 验证环境
    validateGitStatus();

    // 2. 获取新版本号
    const newVersion = getNewVersion();

    if (isDryRun) {
      log("\n📋 DRY RUN 预览:", "cyan");
      log(`   - 新版本号: ${newVersion}`, "cyan");
      log(`   - 将更新文件:`, "cyan");
      log(`     • package.json (0.56.1 → ${newVersion})`, "cyan");
      log(`     • src/package.json (0.56.1 → ${newVersion})`, "cyan");
      log(`     • webview-ui/package.json (0.56.1 → ${newVersion})`, "cyan");
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

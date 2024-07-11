const fs = require('fs');
const semver = require('semver');
const { execSync } = require('child_process');

const status = execSync('git status --porcelain').toString().trim();
if (status) {
  throw new Error('Working directory or staging area is not clean. Please commit or stash your changes.');
}

/**
 * @typedef {'minor' | 'major' | 'patch'} releaseType
 */
const releaseType = process.argv[0];
if (!['minor', 'major', 'patch'].includes(upgrade)) {
  throw new Error('Invalid version release type');
}

const utoolsPluginJsonPath = '../plugin.json';
const utoolsPluginJsonContent = fs.readFileSync(utoolsPluginJsonPath, 'utf8');
const utoolsPluginJson = JSON.parse(utoolsPluginJsonContent);
const currentUtoolsPluginVersion = utoolsPluginJson.version;

// 读取package.json文件
const packageJsonPath = '../package.json';
const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
const packageJson = JSON.parse(packageJsonContent);
const currentPackageJson = packageJson.version;

if (currentUtoolsPluginVersion !== currentPackageJson) {
  throw new Error('utools plugin version is not equal to package.json version');
}

// 步骤3: 提升版本号
const newVersion = semver.inc(currentPackageJson, releaseType);

utoolsPluginJson.version = newVersion;
packageJson.version = newVersion;

const newUtoolsPluginJsonContent = JSON.stringify(utoolsPluginJson, null, 2);
fs.writeFileSync(utoolsPluginJsonPath, newUtoolsPluginJsonContent, 'utf8');

const newPackageJsonContent = JSON.stringify(packageJson, null, 2);
fs.writeFileSync(packageJsonPath, newPackageJsonContent, 'utf8');

// 步骤5: 使用git命令打标签并推送
execSync('git add .');
// execSync('git commit -m "version: ' + newVersion + '"');
// execSync(`git tag v${newVersion}`);

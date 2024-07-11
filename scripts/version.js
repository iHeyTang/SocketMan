const fs = require('fs');
const semver = require('semver');
const { execSync } = require('child_process');

const status = execSync('git status --porcelain').toString().trim();
if (status) {
  console.log('Working directory or staging area is not clean. Please commit or stash your changes.');
  process.exit(1);
}

// 保证构建可以成功
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (e) {
  console.error('Build failed');
  process.exit(1);
}

/**
 * @typedef {'minor' | 'major' | 'patch'} releaseType
 */
const releaseType = process.argv[2];
if (!['minor', 'major', 'patch'].includes(releaseType)) {
  console.error('Invalid version release type');
  process.exit(1);
}

const utoolsPluginJsonPath = './plugin.json';
const utoolsPluginJsonContent = fs.readFileSync(utoolsPluginJsonPath, 'utf8');
const utoolsPluginJson = JSON.parse(utoolsPluginJsonContent);
const currentUtoolsPluginVersion = utoolsPluginJson.version;

// 读取package.json文件
const packageJsonPath = './package.json';
const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
const packageJson = JSON.parse(packageJsonContent);
const currentPackageJson = packageJson.version;

if (currentUtoolsPluginVersion !== currentPackageJson) {
  console.error('utools plugin version is not equal to package.json version');
  process.exit(1);
}

const newVersion = semver.inc(currentPackageJson, releaseType);

utoolsPluginJson.version = newVersion;
packageJson.version = newVersion;

const newUtoolsPluginJsonContent = JSON.stringify(utoolsPluginJson, null, 2);
fs.writeFileSync(utoolsPluginJsonPath, newUtoolsPluginJsonContent, 'utf8');

const newPackageJsonContent = JSON.stringify(packageJson, null, 2);
fs.writeFileSync(packageJsonPath, newPackageJsonContent, 'utf8');

execSync('git add plugin.json package.json');
execSync(`git commit -m "version: release v${newVersion}"`);
execSync(`git tag v${newVersion}`);
execSync('git push --tags');

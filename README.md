# NetKeeper

NetKeeper（校园网保活助手）是一个基于 `Electron + Vue 3 + TypeScript + Vite` 的 Windows / Linux 桌面应用，用于自动检测校园网连通状态，并在外网不可达时自动重新认证。

当前版本：`0.4.0`

当前版本已按安徽理工大学 Drcom 认证网关适配，支持通过账号、密码和认证出口完成校园网自动重连。软件已支持系统托盘、开机自启动、本地配置保存、Windows 安装包、Linux AppImage / Debian 安装包，以及在软件内部尽量绕过系统代理进行直连检测和认证。

## 功能

- 校园网账号、密码、认证出口配置
- 教职工 / 电信 / 联通 / 移动出口后缀自动拼接
- 自动重连开关控制检测和认证流程
- Drcom `GET + JSONP` 登录
- 登录前自动访问认证首页预热会话
- 定时检测网络连通状态
- 网络异常时自动重新登录
- 运行状态和关键事件日志显示
- 系统托盘隐藏、打开、暂停和退出
- 开机自启动开关
- 本地配置保存，密码不写入日志
- 独立直连请求通道，降低 Clash 等系统代理干扰
- Windows / Linux 应用图标和托盘图标
- Windows NSIS、Linux AppImage、Debian 和 tar.gz 打包

## 校园网连接规则

当前版本默认适配安徽理工大学 Drcom 认证网关。认证出口、网关地址、账号格式、网络检测与自动重连流程、代理限制以及常见认证错误，统一整理在 [CAMPUS_NETWORK.md](./CAMPUS_NETWORK.md)。

简要来说，开启“自动重连”后，软件会定时直连百度和阿里云检测外网；只有两个检测地址都无法确认外网可达，或检测结果命中校园网认证页特征时，才会访问认证网关并重新登录。该机制不是固定时间强制登录。

## 开发环境快速开始

开发和打包需要 Node.js `>=20.19.0` 以及 npm。首次使用建议安装锁定版本依赖：

```bash
npm ci
npm run dev
```

当前 `package-lock.json` 的下载地址使用 `registry.npmmirror.com`。如果 npm 12 报 `EALLOWREMOTE`，请让 npm 使用同一镜像源，或在发布到其他环境前用目标 registry 重新生成锁文件。

## 常用命令

```bash
npm run typecheck
npm run build
npm run dist
npm run dist:linux
npm run pack:linux
npm run dist:linux:tar
```

## 打包

当前版本号来自 `package.json` 和 `package-lock.json`，安装包文件名会自动使用该版本号。所有产物默认输出到：

```txt
release/
```

指定新版本并打包，例如 `0.5.0`：

```bash
npm version 0.5.0 --no-git-tag-version
```

也可以手动修改 `package.json` 和 `package-lock.json` 中的 `version` 后再执行对应平台的打包命令。

### Windows 打包

```bash
npm run dist
```

当前 Windows 目标为 x64 NSIS 安装包：

```txt
release/NetKeeper-0.4.0-setup.exe
release/win-unpacked/
```

建议使用 Windows 10 / 11 64 位系统运行。当前未配置 Windows ARM64 安装包。

### Linux 打包

在 Linux 构建机上执行：

```bash
npm run dist:linux
```

该命令生成 Linux x64/amd64 的 AppImage 和 Debian 安装包：

```txt
release/NetKeeper-0.4.0-x86_64.AppImage
release/NetKeeper-0.4.0-amd64.deb
```

其他 Linux 打包命令：

```bash
# 只生成 Linux 免安装目录
npm run pack:linux

# 生成 tar.gz 便携包
npm run dist:linux:tar
```

完整的 AppImage / `.deb` 构建建议在 Linux 或 WSL2 中进行；Windows 构建机适合生成 `tar.gz` 便携包。

## 系统要求与安装

### Windows

- 建议使用 Windows 10 / 11 64 位系统。
- 双击 `NetKeeper-${version}-setup.exe` 安装。
- 卸载可在“设置 → 应用”中完成。
- 开机自启动使用 Windows 登录项。
- 系统托盘需要允许桌面通知区域图标显示。

### Linux（Ubuntu / Debian）

当前 Linux 版本仅支持 x64/amd64，建议使用 Ubuntu 22.04 / 24.04、Debian 12 或兼容的 x86_64 发行版。当前没有 Linux ARM64 或 armv7 构建。

#### 安装 Debian 包

```bash
sudo apt install ./release/NetKeeper-0.4.0-amd64.deb
```

安装包声明了 `libsecret-1-0` 依赖，并推荐 `libappindicator3-1`。卸载命令：

```bash
sudo apt remove netkeeper
```

#### 运行 AppImage

```bash
chmod +x ./release/NetKeeper-0.4.0-x86_64.AppImage
./release/NetKeeper-0.4.0-x86_64.AppImage
```

如果系统没有 FUSE，Ubuntu 22.04 通常需要安装 `libfuse2`，较新的 Ubuntu 版本可能使用 `libfuse2t64`；也可以使用 AppImage 解压运行方式：

```bash
./release/NetKeeper-0.4.0-x86_64.AppImage --appimage-extract-and-run
```

#### 运行 tar.gz

```bash
tar -xzf ./release/NetKeeper-0.4.0-x64.tar.gz
cd NetKeeper-0.4.0-x64
./netkeeper
```

#### Linux 桌面环境要求

- 使用安全密码存储需要 Secret Service / libsecret，例如 GNOME Keyring 或 KDE Wallet；没有可用密钥环时，密码会退化为 Base64 形式保存。
- 系统托盘需要 AppIndicator / StatusNotifier 支持，部分 GNOME 环境需要安装并启用 AppIndicator 扩展。
- Linux 开机自启动使用 XDG autostart，文件位于 `~/.config/autostart/netkeeper.desktop`。
- AppImage 开启自启动后不要随意移动 AppImage 文件；如果移动，需要关闭后重新开启开机自启动。

## 配置保存

用户配置按操作系统分别保存在 Electron 的 `userData` 目录：

```txt
Windows: %APPDATA%\NetKeeper\netkeeper.config.json
Linux:   ~/.config/NetKeeper/netkeeper.config.json
```

配置始终按当前操作系统用户分别保存，Windows 和 Linux 之间不会自动共享配置文件。

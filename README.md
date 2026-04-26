# NetKeeper

NetKeeper（校园网保活助手）是一个基于 `Electron + Vue 3 + TypeScript + Vite` 的 Windows 桌面应用，用于自动检测校园网连通状态，并在外网不可达时自动重新认证。

当前版本：`0.2.0`

当前版本已按安徽理工大学 Drcom 认证网关适配，支持通过账号、密码和认证出口完成校园网自动重连。软件已支持系统托盘、开机自启动、本地配置保存、Windows 安装包打包，以及在软件内部尽量绕过系统代理进行直连检测和认证。

## 功能

- 校园网账号、密码、认证出口配置
- 电信 / 联通 / 移动出口后缀自动拼接
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
- Windows 应用图标、托盘图标和安装包图标

## 当前适配

当前网关配置集中在 `src/main/aust-drcom-config.ts`：

- 认证首页：`http://10.255.0.19/`
- 登录接口：`http://10.255.0.19/drcom/login`
- 学生电信出口：`@aust`
- 学生联通出口：`@unicom`
- 学生移动出口：`@cmcc`

如学校接口变化，优先修改 `src/main/aust-drcom-config.ts`。

## 自动重连逻辑

NetKeeper 不是固定时间强制登录一次，而是：

1. 用户打开“自动重连”。
2. 软件每隔配置的检测间隔检测网络。
3. 优先直连访问百度、阿里云判断外网是否可达。
4. 如果网络正常，只更新状态，不执行登录。
5. 如果网络异常，才调用校园网登录接口重新认证。

## 代理处理

NetKeeper 已增加独立直连请求通道：

```txt
src/main/direct-fetch.ts
```

网络检测和校园网认证请求会尽量不使用 Windows 系统代理，能缓解 Clash 普通系统代理残留导致无法认证的问题。

当前实测结果：

- 只要 Clash 开启“开机自启动”，NetKeeper 在 Clash 普通代理模式和 `TUN` 模式下都可以正常连接校园网。
- 这个前提很重要：Clash 必须开启开机自启动。
- 如果 Clash 没有开机自启动，但 Windows 保留了上一次的代理或网络接管状态，开机后可能出现浏览器和 NetKeeper 请求异常。

建议同时开启：

- Clash 开机自启动
- NetKeeper 开机自启动

## 快速开始

```bash
npm install
npm run dev
```

## 常用命令

```bash
npm run typecheck
npm run build
npm run dist
```

## 打包

当前版本号来自 `package.json` 和 `package-lock.json`，安装包文件名会自动使用该版本号。

生成当前版本 Windows 安装包：

```bash
npm run dist
```

指定新版本并打包，例如 `0.3.0`：

```bash
npm version 0.3.0 --no-git-tag-version
npm run dist
```

也可以手动修改 `package.json` 和 `package-lock.json` 中的 `version` 后再执行：

```bash
npm run dist
```

打包产物默认输出到：

```txt
release/
```

当前 `0.2.0` 安装包：

```txt
release/NetKeeper-0.2.0-setup.exe
```

免安装运行目录：

```txt
release/win-unpacked/
```

## 配置保存

用户配置默认保存到：

```txt
%APPDATA%\NetKeeper\netkeeper.config.json
```

安装方式分为用户安装和系统安装，但配置始终按当前 Windows 用户分别保存。

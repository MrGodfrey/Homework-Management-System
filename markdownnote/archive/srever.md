# 腾讯云服务器通过 SSH + VS Code 自动登录完整方案

本文目标：在 macOS 上配置好 SSH 密钥登录，并通过 VS Code 的 Remote - SSH 实现快速连接（接近自动登录）。

## 1. 前置条件

你需要准备：

1. 一台腾讯云 CVM 实例（Linux）。
2. 已知服务器公网 IP，例如 `162.14.78.163`。
3. 已知登录用户名：
	 - Ubuntu 常见是 `ubuntu`
4. 本机已安装 OpenSSH（macOS 默认有）。
5. 本机已安装 VS Code。

建议先在腾讯云控制台确认：

1. 实例安全组已放通 `22/TCP`（来源可先设 `0.0.0.0/0` 测试，后续建议收敛到你的固定公网 IP）。
2. 你有初始登录方式, 通过 SSH

## 2. 本机生成 SSH 密钥

如果你本机已经有密钥（例如 `~/.ssh/id_ed25519`），可以复用；没有就生成一对。

```bash
# 推荐 ed25519 算法
ssh-keygen -t ed25519 -C "vscode-tencent" -f ~/.ssh/tencent
```

说明：

1. `-f` 指定密钥文件名，便于和其他服务器隔离。
2. 过程中会让你输入 passphrase（密钥口令）：
	 - 安全优先：建议设置口令，然后结合 ssh-agent。
	 - 追求极简自动化：可留空，但安全性较低。

查看公钥内容：

```bash
cat ~/.ssh/tencent.pub
```

## 3. 把公钥写入腾讯云服务器

### 方式 A（推荐）：用腾讯云控制台导入/绑定密钥

1. 在腾讯云控制台进入「密钥」服务。
2. 新建密钥，将上一步 `.pub` 内容粘贴进去。
3. 绑定到目标 CVM。
4. 按腾讯云提示重启实例或执行生效操作。

### 方式 B：手工写入 `authorized_keys`

先用密码登录一次服务器，然后执行：

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "你的公钥整行内容" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

如果你是用 `root` 配置给普通用户，要确认写入的是目标用户家目录。

## 4. 配置本机 SSH config（关键）

编辑本机 `~/.ssh/config`：

```ssh-config
Host tencent-prod
	HostName 43.xx.xx.xx
	User ubuntu
	Port 22
	IdentityFile ~/.ssh/tencent
	IdentitiesOnly yes
	ServerAliveInterval 60
	ServerAliveCountMax 3
```

参数解释：

1. `Host`：你自定义的别名，后面 VS Code 就用它。
2. `HostName`：服务器公网 IP。
3. `User`：服务器用户名。
4. `IdentityFile`：私钥路径。
5. `IdentitiesOnly yes`：避免本机加载多把钥匙时握手混乱。

给权限（很重要）：

```bash
chmod 600 ~/.ssh/tencent.pem
```

先在终端验证：

```bash
ssh tencent-prod
```

如果出现需要输入密码的情况，就可能是上面的权限没有给对，需要重新设置权限才行。

如果能直接登录（或只输入一次口令）即表示 SSH 已通。

## 5. 配置 ssh-agent（减少重复输入）

如果私钥设置了 passphrase，可以把密钥加入系统 keychain，实现后续几乎免输。

先在 `~/.ssh/config` 增强该 Host：

```ssh-config
Host tencent-prod
	HostName 43.xx.xx.xx
	User ubuntu
	Port 22
	IdentityFile ~/.ssh/tencent
	IdentitiesOnly yes
	AddKeysToAgent yes
	UseKeychain yes
```

然后执行：

```bash
ssh-add --apple-use-keychain ~/.ssh/tencent
```

这样你首次输入 passphrase 后，系统会记住，后续连接体验接近自动登录。

## 6. VS Code 配置 Remote - SSH

1. 安装扩展：`Remote - SSH`（发布者 Microsoft）。
2. 打开命令面板：`Cmd + Shift + P`。
3. 选择 `Remote-SSH: Connect to Host...`。
4. 选择 `tencent-prod`。
5. 首次连接会让你确认指纹，输入 `yes`。
6. 连接成功后，VS Code 左下角会显示 `SSH: tencent-prod`。

首次连接会在远端安装 VS Code Server，等安装完成即可。

## 7. 实现真正“点击即连”的方法

### 方法 1：Recent Hosts

连接一次后，后续可在 Remote Explorer 中直接点主机名连接。

### 方法 2：单独工作区保存

这个方法适合你有固定服务器、固定项目目录的场景。核心思路是：

1. 先连接远端主机。
2. 在远端窗口里打开项目目录。
3. 把当前窗口状态保存成一个本地 `.code-workspace` 文件。
4. 以后双击这个工作区文件即可自动重连到远端。

具体操作如下：

1. 在 VS Code 执行 `Remote-SSH: Connect to Host...`，连接 `tencent-prod`。
2. 连接成功后，执行 `File: Open Folder...`（或菜单 `File -> Open Folder...`）。
3. 选择服务器上的项目目录，例如 `/home/ubuntu/app`。
4. 确认左下角显示 `SSH: tencent-prod`，并且资源管理器里能看到远端文件。
5. 执行 `File: Save Workspace As...`。
6. 保存到本机一个固定位置（建议）：`~/Documents/vscode-workspaces/tencent-prod-app.code-workspace`。
7. 关闭当前窗口，测试打开刚保存的 `.code-workspace` 文件。
8. 如果配置无误，VS Code 会自动触发 Remote-SSH 并回到同一个远端目录。

建议补充：

1. 一个服务器目录对应一个 `.code-workspace` 文件，命名清晰一些（如 `tencent-prod-api.code-workspace`）。
2. 可以把这个工作区文件固定到 Finder 侧边栏或 Dock，后续基本就是双击即连。
3. 如果公司网络变化频繁，优先配好 ssh-agent 和 keychain，避免重连时反复输口令。

如果你想直接手写 `.code-workspace` 文件，也可以用下面模板（路径按你实际目录改）：

```json
{
	"folders": [
		{
			"uri": "vscode-remote://ssh-remote+tencent-prod/home/ubuntu/app"
		}
	],
	"settings": {
		"remote.SSH.useLocalServer": true
	}
}
```

说明：

1. `ssh-remote+tencent-prod` 里的 `tencent-prod` 必须和 `~/.ssh/config` 的 `Host` 别名一致。
2. `uri` 后半段是服务器上的绝对路径。
3. 这个文件保存在本地，不在服务器上。

### 方法 3：终端别名（可选）

在 `~/.zshrc` 增加：

```bash
alias tx='ssh tencent-prod'
```

执行 `source ~/.zshrc` 后，命令行输入 `tx` 即可登录。

## 8. 常见问题排查

### 1) `Permission denied (publickey)`

排查顺序：

1. `~/.ssh/config` 的 `User` 是否正确。
2. `IdentityFile` 路径是否正确。
3. 远端 `~/.ssh/authorized_keys` 是否包含公钥完整一行。
4. 本地和远端 `.ssh` 权限是否正确。
5. 安全组是否放通 22 端口。

可用详细日志定位：

```bash
ssh -vvv tencent-prod
```

### 2) 超时 `Connection timed out`

1. 服务器公网 IP 是否正确。
2. 安全组是否放通 `22/TCP`。
3. 服务器是否关机或网络异常。

### 3) VS Code 连不上，但终端能连

1. 检查 VS Code 使用的 SSH 配置文件路径（Remote-SSH 设置）。
2. 在命令面板执行 `Remote-SSH: Kill VS Code Server on Host...` 后重连。
3. 升级 VS Code 和 Remote - SSH 扩展。

## 9. 安全建议（生产环境强烈建议）

1. 禁用密码登录，仅保留密钥登录。
2. 尽量禁用 root 直登，使用普通用户 + `sudo`。
3. 安全组 22 端口限制为固定办公 IP。
4. 定期轮换 SSH 密钥。

参考（服务器 `/etc/ssh/sshd_config` 常见建议）：

```conf
PasswordAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
```

改完后重启 SSH 服务（不同发行版命令略有差异）：

```bash
sudo systemctl restart sshd
# 或
sudo systemctl restart ssh
```

## 10. 最小可用模板（可直接替换）

```ssh-config
Host tencent-prod
	HostName <你的公网IP>
	User <你的用户名>
	Port 22
	IdentityFile ~/.ssh/tencent
	IdentitiesOnly yes
	AddKeysToAgent yes
	UseKeychain yes
```

完成后，你的日常连接路径就是：

1. 终端：`ssh tencent-prod`
2. VS Code：`Remote-SSH: Connect to Host... -> tencent-prod`

这套配置完成后，基本就是“打开 VS Code -> 选择主机 -> 自动登录”。


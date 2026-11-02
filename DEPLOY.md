# 化学小屋 · 发布上线指南

本文件夹（`化学小屋/`）已经是一个**纯静态网站**（首页 `index.html` + 6 个课件，全部用相对链接），
可以直接托管到任意静态托管平台，不需要数据库、不需要后端。

> 本仓库已 `git init` 并提交（162 个文件）。下面任选一种方式即可获得**长期固定、任何电脑都能打开**的网址。

---

## 方式一：GitHub Pages（推荐，免费、永久、固定网址）

适合：有 GitHub 账号，或愿意花 2 分钟注册一个。

1. 打开 https://github.com ，注册/登录。
2. 新建仓库（New repository），名字随意，例如 `chemhouse`。**不要**勾选 README（保持空仓库）。
3. 在本机（已装好 git）执行：
   ```bash
   cd 化学小屋
   git branch -M main
   git remote add origin https://github.com/你的用户名/chemhouse.git
   git push -u origin main
   ```
4. 仓库页面 → **Settings → Pages → Build and deployment → Source 选 "Deploy from a branch"**，
   Branch 选 `main`、目录选 `/ (root)`，保存。
5. 等约 1 分钟，访问 `https://你的用户名.github.io/chemhouse/` 即可。
   之后每次更新内容，只需 `git add -A && git commit -m 更新 && git push`。

> 不会推？把仓库地址发给我，并生成一个 **Personal Access Token（勾 repo 权限）** 粘贴给我，
> 我可以直接帮你 `git push` 上线。

---

## 方式二：Gitee Pages（国内访问更快）

步骤与 GitHub 几乎一致，换成 https://gitee.com ：
1. 新建仓库 `chemhouse`；
2. `git remote add origin https://gitee.com/你的用户名/chemhouse.git` 后 `git push`；
3. 仓库 → **服务 → Gitee Pages → 部署分支 main / 根目录** → 启动。

---

## 方式三：腾讯云 COS 静态网站（不用 git，上传即可）

适合：不想碰 git、有腾讯云账号。
1. 登录腾讯云 → 对象存储 COS → 新建存储桶（公有读）。
2. 把本文件夹**所有内容**上传到存储桶根目录。
3. 存储桶 → **基础配置 → 静态网站** → 开启，索引文档填 `index.html`。
4. 访问给出的"静态网站域名"即可。

---

## 方式四：Cloudflare Pages / Netlify（拖拽上传，零命令）

1. 打开 https://pages.cloudflare.com 或 https://app.netlify.com/drop ；
2. 直接把 `化学小屋` 文件夹拖进去；
3. 自动获得一个固定网址（可绑定自定义域名）。

---

## 临时访问（仅本机/同局域网，无需上线）

如果暂时只想在学校机房/同一 WiFi 下用：
```bash
cd 化学小屋
python -m http.server 8000 --bind 0.0.0.0
```
- 本机打开：http://127.0.0.1:8000/
- 同网其他设备打开：http://<本机局域网IP>:8000/ （如 http://192.168.1.81:8000/）
- 注意：需在 Windows 防火墙放行 8000 端口入站，其他设备才能访问。
- 此方式依赖电脑开机且命令在运行，**不是公网链接**，校外/其他网络打不开。

---

## 结论建议

- 想要"在任何地方、任何电脑都能打开" → 选 **方式一 GitHub Pages**（或方式二 Gitee）。
- 完全不想配置 → 选 **方式四 拖拽上传**，2 分钟搞定。
- 免费公网隧道（serveo/localhost.run）不稳定会断、网址每次随机，**不建议作为长期方案**。

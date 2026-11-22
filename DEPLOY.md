# 发布上线说明

本站是纯静态站点（无数据库、无后端、无构建），仓库根目录就是站点根目录。

## 当前状态

已托管在 **GitHub Pages**：

- 仓库：<https://github.com/a1b2c312/a6>
- 线上：<https://a1b2c312.github.io/a6/>
- 部署方式：`main` 分支 / 根目录（`/`），根目录的 `.nojekyll` 用于关闭 Jekyll 处理

## 日常更新

```bash
git add -A
git commit -m "更新说明"
git push
```

推送后约 1 分钟自动生效。若页面没变，先强制刷新（`Ctrl+F5`），或检查改动的 css/js 是否升了 `?v=` 版本号。

> 仓库里有 86MB 的视频，`git clone` 较慢。只想拿代码不看视频可用：
> `git clone --filter=blob:limit=5m https://github.com/a1b2c312/a6.git`

## 换到别的平台

**Gitee Pages**（国内访问更快）：新建仓库 → `git remote add gitee ...` → `git push` → 服务 → Gitee Pages → 部署 `main` / 根目录。

**Cloudflare Pages / Netlify**（拖拽上传，零命令）：把整个仓库文件夹拖进 <https://pages.cloudflare.com> 或 <https://app.netlify.com/drop>，索引文档填 `index.html`。

**腾讯云 COS 静态网站**：建公有读存储桶 → 上传全部内容 → 基础配置 → 静态网站 → 索引文档 `index.html`。

## 临时访问（机房 / 同一 WiFi，无需上线）

```bash
python -m http.server 8000 --bind 0.0.0.0
```

- 本机：<http://127.0.0.1:8000/>
- 同网设备：`http://<本机局域网IP>:8000/`
- Windows 需在防火墙放行 8000 端口入站；此方式依赖电脑开机且命令在跑，**不是公网链接**。

免费公网隧道（serveo / localhost.run）会断、网址随机，不建议作为长期方案。

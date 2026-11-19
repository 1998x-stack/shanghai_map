# Shanghai Map · GitHub / Vercel 部署与健康验收

**项目**：`1998x-stack/shanghai_map` → `xiemings-projects/shanghai-map`。这是完全静态的 HTML/CSS/JS 应用，不需要 Next.js、Functions、数据库、环境变量或地图 API Key。

## 1. 发布路径

```text
feature branch -> GitHub PR -> Actions check + smoke -> squash merge main
                         |                                  |
                         └-> Vercel Preview                 └-> Vercel Production
                                                              |
                                       inspect SHA + READY + domain and HTTP health
```

由于 Vercel Git Integration 会独立触发构建，**GitHub Actions 通过并不等于自动限制 Vercel 生产发布**。如未来需要强制“CI 通过才上生产”，应通过 Vercel Deployment Checks / 项目批准流程及分支保护配置实际设置并验证，不可仅凭本仓库 workflow 的存在作出声明。

## 2. 本地验收

```bash
npm run check
python3 -m http.server 8765 --bind 127.0.0.1
# 新终端
SMOKE_BASE_URL=http://127.0.0.1:8765 npm run smoke
```

无需 `npm install`，CI 使用 Node 22。手工浏览器验证需单独覆盖：

- 360px、390px、768px 和桌面视口下地图区域、版权署名及全部按钮无溢出。
- 鼠标滚轮、拖动、键盘和移动端双指缩放后纬度/经度与缩放级别同步。
- 城市参考中心与全域参考范围动作是否正确；后者不产生行政界线。
- 断开 Leaflet CDN 网络时是否显示可用 fallback；OSM tile 网络失败时是否有 warning 而不是假成功。
- `https://shanghai-map.vercel.app/health.json` 返回 JSON 并且 `scope=static-build-only`。它只证明静态产物被服务，不验证瓦片网络和业务。
- 匿名访问生产域名是否有 Vercel Deployment Protection，不能为让测试通过而擅自关闭保护。

## 3. Vercel 配置

- GitHub：`1998x-stack/shanghai_map`
- Project：`shanghai-map`；ID `prj_VAVlvIQu8WHmY5voHvrrQ98dw6MB`
- Framework：Other / static；Root Directory 为仓库根目录，Output Directory 不配置。
- `vercel.json`：固定静态安全头，HTTPS OSM Tile Host、unpkg Leaflet CDN 资源被明确允许；不上传任何密钥。
- 生产域名：`shanghai-map.vercel.app`（必须通过 Vercel Domain 和真实 HTTP 检查来确认）。
- 不要为这个静态 Demo 添加数据库或未经必要评估的 Edge Proxy；浏览器直连 OSM 瓦片并尊重其政策。

## 4. 故障定位

| 症状 | 可能原因 | 验证与处置 |
|---|---|---|
| HTTP 200 但地图空白 | unpkg 被拦截、CSP 或第三方网络问题 | 看浏览器 Console 和 Network，确认 SRI/CSP、资源可用性 |
| 页面可见但底图缺块 | OSM tile 被拦截或网络故障 | 检查可见瓦片请求及 Referer；勿批量重试或关闭浏览器缓存 |
| 坐标不变 | 地图事件未触发 / UI 状态失联 | `npm run check`，验证 `moveend zoomend` |
| 手机按钮压住署名 | map overlay 层级/视口小 | 手动 320px/390px 复核，署名始终应可见 |
| Vercel READY，域名访问 401/403 | Deployment Protection 或团队 SSO | 核查项目/域名权限，按产品目标设置，勿擅自解除 |
| `/health.json` 200，瓦片仍失败 | 探针不检测第三方服务 | 按真实终端检查外部资源，不将 health 当作所有功能存活 |

## 5. 记录与回滚

每次更新记录：PR 编号、最终 Git SHA、CI 运行结果、对应 Vercel Preview/Production Deployment ID、目标 `production` 状态、域名绑定与真实访问验证结果。任何一步未实测必须标为 `NOT RUN` / `NOT VERIFIED`。

需要回滚时，应确认上一可用 Production Deployment 和内容变更范围；如果执行 Vercel Rollback，后续自动发布可能需要手工重新恢复自动域名分配，避免误操作。

**地图数据许可与境内公开互联网地图服务资质属于另行审查的合规门槛**，不能通过 CI 简单宣称解决。

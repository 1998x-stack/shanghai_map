# Shanghai Map · 上海地图实验室

> 轻量的上海城市地图交互演示。无后端、无浏览器定位权限、无需地图 API Key。适合探索 Leaflet 地图控件、可访问性、数据来源和静态部署；**不属于官方测绘产品或可用于导航的地图服务**。

**GitHub**: https://github.com/1998x-stack/shanghai_map  
**Vercel 项目**: https://vercel.com/xiemings-projects/shanghai-map  
**Vercel 默认域名**: https://shanghai-map.vercel.app/ （必须通过独立 HTTP/浏览器验收确认是否可公开访问）

## 功能

- 默认以经纬度参考中心点 `31.2304 N / 121.4737 E` 展示上海，不假定它是法定行政中心或精确测绘结果。
- 提供“回到中心”与“上海参考经纬度范围”操作，支持鼠标、触控、键盘缩放/平移；地图移动与缩放显示保持同步。
- 参照上海市政府公布的经纬度范围：**纬度 30°40′–31°53′ N、经度 120°51′–122°12′ E**。这里只做 `fitBounds` 视图定位；**没有绘制行政界线，不表示行政边界法律效力**。
- 明确标注 OpenStreetMap 数据来源、上海市政府地理介绍、天地图·上海官方服务及地图管理要求；移除原本缺少时间与来源的 `Population: 26.32 million`。
- OSM 瓦片失败时显示状态；Leaflet CDN 脚本无法加载时提供官方地图入口。显示的状态不证明所有图块在全球网络可用。
- 使用适合桌面与手机的响应式布局，48px 左右的触控按钮、合理的图层层级、语义标签、键盘焦点和 `prefers-reduced-motion`。
- 不使用 Web Geolocation、不上传用户坐标、不配置跟踪器；“复制坐标”仅在用户主动点击时调用剪贴板 API。

## 本地启动与验证

依赖 Node.js 20+（推荐 Node 22），测试零第三方 npm 依赖：

```bash
git clone https://github.com/1998x-stack/shanghai_map.git
cd shanghai_map
npm run check
python3 -m http.server 8765 --bind 127.0.0.1
# 新开一个终端
SMOKE_BASE_URL=http://127.0.0.1:8765 npm run smoke
```

浏览器访问 `http://127.0.0.1:8765/`。本地脚本只测试网页文件 HTTP 200、静态健康文件和地图代码逻辑；**不批量获取 OSM 瓦片，也不伪称执行了真实移动浏览器端到端测试**。如实际浏览器加载失败，请先检查网络对 `unpkg.com` 和 `tile.openstreetmap.org` 的访问。

## 主要目录

```text
index.html                     # 语义化 UI 与固定 Leaflet SRI
style.css                      # 响应式布局与地图图层
script.js                      # OSM 初始化、视图控制、状态、降级
vercel.json                    # 静态部署安全响应头
health.json                    # 构建产物探针，不检测第三方瓦片
tests/map.test.mjs             # Node 环境的地图行为模拟单测
scripts/smoke.mjs              # 本地静态 HTTP 冒烟
.github/workflows/verify.yml   # PR/Main 校验
docs/AUDIT_2026-11-19.md       # 证据、修复及限制
docs/DEPLOYMENT.md             # 发布/验收手册
```

## 底图来源与使用条款

底图以 **Leaflet 1.9.4** 在浏览器中按当前视窗加载 `https://tile.openstreetmap.org/{z}/{x}/{y}.png`。地图右下角持续显示 **© OpenStreetMap contributors** 授权署名。

[OSMF 瓦片政策](https://operations.osmfoundation.org/policies/tiles/) 要求正确来源标注、常规 HTTP Referer、尊重浏览器缓存；**不允许批量抓取、离线下载或预取大面积底图**。当前网页没有预取工具、服务端瓦片代理或离线缓存功能；`Referrer-Policy: strict-origin-when-cross-origin` 允许瓦片请求发送来源域名。OSM 公共服务是尽力而为，无 SLA；生产高流量/商业使用前应评估合规的托管地图服务商或自行提供合法授权的底图。

**坐标、底图和城市参考范围来自不同信息源。** 如果与 GCJ-02/BD-09 地图叠加，不得未经专业转换直接复用 WGS84 坐标，因为可能发生偏移。本项目没有添加可能引入许可或坐标误差的多底图叠加。

参考：
- [上海市政府英文网站：地理位置与范围（2025-09-10 更新）](https://english.shanghai.gov.cn/en-Overview/20231209/705180b43f794c1ca43f4d1ddaa049a2.html)
- [上海市地理信息公共服务平台·天地图](https://shanghai.tianditu.gov.cn/)
- [Leaflet 1.9.4 Quick Start 与官方 SRI](https://leafletjs.com/examples-v1/quick-start/)

## 合规与产品范围

上海市的互联网地图服务受到中国法律、国务院《地图管理条例》与《上海市地图管理办法》约束。商业化、面向中国境内广泛提供公开服务、标注 POI 或行政界线之前，应核查地图审图号、测绘资质/服务主体、互联网地图服务备案和数据许可。**不能因为展示 OSM 底图或 Vercel READY 就认定已经具备相关资格。**

项目保留开发、测试及合规审查责任，**不伪造审图号**。如需要境内正式地图服务，优先评估已获准地图产品及具备资质的合作方（例如天地图·上海），并以真实授权条款为准。

[详见工程审计](docs/AUDIT_2026-11-19.md) · [部署 Runbook](docs/DEPLOYMENT.md)

## License

本仓库原声明为 MIT；底图和 Leaflet 等第三方素材仍分别遵守其各自授权，不因源代码许可而变成可任意再分发。

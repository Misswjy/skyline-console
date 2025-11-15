## 目标

- 将虚拟机监控页的域名解析改为优先从 Skyline 扩展 API `extension.servers` 获取，减少对 Prometheus 的依赖并提升稳定性。

## 方案

1. 新增函数从扩展 API 获取域名与创建时间：
   - 调用 `client.skyline.extension.servers({ uuid })`
   - 解析 `origin_data["OS-EXT-SRV-ATTR:instance_name"]` 作为 `domain`（兜底 `hostname`、`name`、`id`）
   - 解析 `origin_data.created` 或 `created_at` 为 `createdMs`
   - 写入组件状态并返回解析结果
2. 初始化流程调整：
   - 首先调用扩展 API 获取 `domain` 与 `createdMs`
   - 若扩展不可用或无结果，再回退到 Prometheus 的 `libvirt_domain_openstack_info` 获取 `domain`
   - 若仍无 `createdMs`，仅在首次加载时进行“最早样本时间”兜底并缓存
   - 在获取到 `domain` 后再执行基于 `domain` 的 Prometheus 可用性检查

## 验证

- 扩展 API 可用时，监控页直接解析出 `domain` 与 `createdMs`，减少首屏 Prom 请求
- Prometheus 不可用或扩展不可用时，正确触发回退逻辑并展示提示

## 目标

- 将“自创建至今总流量”的区间起点改为 Skyline 扩展 API 返回的实例创建时间，避免当前显示为 0m。

## 数据来源

- 使用 `client.skyline.extension.servers({ uuid })` 调用后端 `GET /extension/servers?uuid=<id>`，从返回的 `servers[0].origin_data.created` 或 `servers[0].created_at` 解析创建时间。

## 实施步骤

1. 在实例监控包装组件中新增获取创建时间的函数：
   - 调用 `client.skyline.extension.servers({ uuid: instanceId })`，解析 ISO 字符串为毫秒时间戳 `createdMs`。
2. 更新初始化流程：
   - 优先读取 `instanceDetail.created`；若没有，则调用扩展 API 获取 `createdMs`。
   - 保留已有 Prometheus 标签与“最早样本时间”兜底逻辑，仅在上述两个来源都不可用时启用。
3. 透传创建时间：
   - 将 `createdMs` 传入 `getTopCardList(instanceId, domain, createdMs)`，用于将 `[SC]` 动态替换为“自创建至今”的别名。

## 验证

- 确认“自创建”一行显示的区间别名不为 0m，且累计值合理。
- 新建实例时“自创建”≈“今日”；历史实例时“自创建”>“30 天”。

## 影响范围与风险

- 仅新增一次扩展 API 请求，低风险；若扩展服务不可用则仍有兜底方案。

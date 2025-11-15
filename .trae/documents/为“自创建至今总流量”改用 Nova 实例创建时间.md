## 可用数据源

- Nova 实例详情字段 `created`：API `GET /servers/{id}` 返回 ISO 时间字符串，代码中在实例详情页已使用该字段，参见 `src/pages/compute/containers/Instance/Detail/index.jsx:111`。
- 备选：`OS-SRV-USG:launched_at`（若启用扩展时可用，但不稳定）。
- 兜底：Prometheus 网络字节指标的最早样本时间作为近似创建时间（从最早可用样本开始累计，受保留期限制）。

## 调整思路

1. 读取 `instanceDetail.created`
   - 在 `InstanceMonitorWrapper` 初始化时优先从 `this.props.instanceDetail?.created` 计算 `createdMs`。
   - 若不可用，再尝试从 `libvirt_domain_openstack_info` 标签读取；若仍不可用，兜底到“最早样本时间”。
2. 传递 `createdMs` 到监控卡片
   - 将 `createdMs` 透传至 `getTopCardList(instanceId, domain, createdMs)`，`convertUrl` 用它生成 `[SC]` 动态区间别名（例如 `12d3h20m`）。
3. 兜底“最早样本时间”实现
   - 对 `libvirt_domain_interface_stats_transmit_bytes_total{domain="..."}` 和 `receive...` 发起短窗口 `query_range`（例如近 30 天），聚合取最小时间戳，作为近似创建时间。
   - 为避免额外开销，仅当 `createdMs` 未获且需要“自创建”时才执行一次。

## 验证

- 新建实例：“自创建”累计 ≈“今日累计”；历史实例：自创建累计>30 天累计。
- 关闭 Prometheus 标签或不可用时，仍能显示兜底累计（保留期范围内）。

## 变更范围

- `src/pages/compute/containers/Instance/Detail/Monitor/index.jsx`：在 `InstanceMonitorWrapper` 中新增从 `instanceDetail.created` 生成并传递 `createdMs` 的逻辑；保留现有 Prom 标签与兜底逻辑，减少依赖风险。
- 其余指标与渲染保持不变。

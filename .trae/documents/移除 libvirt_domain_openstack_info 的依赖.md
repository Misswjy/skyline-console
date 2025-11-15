## 目标

- 全面移除监控页对 Prometheus 指标 `libvirt_domain_openstack_info` 的依赖，统一改为从 `extension.servers` 获取 domain/createdMs。

## 变更

1. 删除字典项：
   - 在 `src/resources/prometheus/metricDict.js` 移除 `instanceMonitor.openstackinfo`。
2. 删除回退函数与调用：
   - 在 `src/pages/compute/containers/Instance/Detail/Monitor/index.jsx` 移除 `getInstanceNameByPrometheus` 函数及其调用。
   - 初始化流程改为：优先 `extension.servers` → 若失败直接使用 `instanceId` 作为兜底 domain；保持创建时间的扩展/详情/兜底探测逻辑。
3. 保持基于 domain 的 Prometheus 可用性检查，并在 domain 决定后执行。

## 验证

- 页面加载正常，监控曲线数据正确；扩展不可用时以 `instanceId` 兜底 domain；无多余的 `openstack_info` 查询。

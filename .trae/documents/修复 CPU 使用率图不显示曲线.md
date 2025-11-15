## 问题分析

- 当前 CPU 图使用自定义 `formatDataFn` 做百分比转换，可能与通用数据管线不一致导致数据未正确渲染。
- 方案改为在 PromQL 层直接输出百分比值，前端使用通用 `handleResponses`。

## 变更

1. 在 `metricDict.js` 的 `instanceMonitor.cpu.finalFormatFunc` 中，将表达式改为 `rate(...[3m])/libvirt_domain_info_virtual_cpus{tags} * 100`，服务端输出百分比。
2. 在 `index.jsx` 的 CPU 图配置中移除自定义 `handleDataParams.formatDataFn`，让默认的 `handleResponses` 负责 `values/value` 解析。

## 验证

- Prometheus 当前区间有数据时，CPU 曲线按百分比正常显示；空数据时仍显示零值回退（已添加）。

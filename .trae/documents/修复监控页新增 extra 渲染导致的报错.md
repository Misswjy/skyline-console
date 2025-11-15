## 问题

- 报错来源：`props.extra()` 在 ChartCard 中被无参调用，而我们新增的 `extra: ({ chartData }) => ...` 需要参数。
- 结果：`Cannot destructure 'chartData' of undefined`。

## 修复方案

1. 修改 ChartCard 将 BaseCard 传入的上下文参数继续透传给 `props.extra`：
   - 把 `props.extra && props.extra()` 改为支持参数：`props.extra && props.extra(...args)`。
2. 为页面内 `extra` 函数加参数默认值与空值保护：
   - 写成 `extra: (v = {}) => { const ys = ((v.chartData)||[])... }`，避免无参调用时报错。

## 影响范围

- 仅前端渲染逻辑，兼容已有无参 `extra` 的使用场景。

## 验证

- 打开监控页不再出现 TypeError；网络速率图右上角统计摘要正常显示。

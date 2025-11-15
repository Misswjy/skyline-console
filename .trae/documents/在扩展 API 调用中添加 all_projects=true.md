## 目标

- 修复扩展 API 调用参数，给 `extension.servers` 增加 `all_projects: true`，确保可跨项目获取实例信息。

## 修改点

- 更新 `src/pages/compute/containers/Instance/Detail/Monitor/index.jsx` 的 `fetchDomainAndCreatedFromExtension`：
  - 将 `client.skyline.extension.servers({ uuid })` 改为 `client.skyline.extension.servers({ uuid, all_projects: true })`。

## 验证

- 监控页能够在需要跨项目查询时正确解析 `domain/createdMs`；接口请求 URL 包含 `&all_projects=true`。

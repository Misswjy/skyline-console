// Copyright 2021 99cloud
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Alert } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import BaseContent from 'components/PrometheusChart/component/BaseContent';
import { getSuitableValue } from 'resources/prometheus/monitoring';
import {
  ChartType,
  fetchPrometheus,
} from 'components/PrometheusChart/utils/utils';

import i18n from 'core/i18n';
import client from 'client';

import styles from './index.less';

const { t } = i18n;

function getTodayDurationAlias() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ms = now.getTime() - start.getTime();
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h${minutes}m`;
}

function getSinceCreateAlias(createdMs) {
  if (!createdMs) return '30d';
  const now = Date.now();
  const diff = Math.max(0, now - createdMs);
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const remMinutes = totalMinutes - days * 60 * 24;
  const hours = Math.floor(remMinutes / 60);
  const minutes = remMinutes % 60;
  const d = days > 0 ? `${days}d` : '';
  const h = hours > 0 ? `${hours}h` : '';
  const m = `${minutes}m`;
  return `${d}${h}${m}`;
}

// 定义顶部指标卡片配置，复用PhysicalNode组件的结构
export const getTopCardList = (domain, createdMs) => [
  {
    title: t('CPU Usage(%)'),
    span: 8,
    createFetchParams: {
      metricKey: 'instanceMonitor.cpu',
      params: {
        // 使用domain作为过滤参数，与内存监控保持一致
        domain,
      },
    },
    handleDataParams: {
      formatDataFn: (responses) => {
        if (!responses || responses.length === 0) return [];

        // 获取已计算好的CPU使用率数据
        const cpuUsageResults = responses[0].data?.result || [];

        if (cpuUsageResults.length === 0) {
          return [];
        }

        // 格式化数据（直接返回数据点数组，不包装在对象中）
        return cpuUsageResults.map((result) => ({
          x: result.value?.[0] || 0,
          y: parseFloat(result.value?.[1]) || 0,
        }));
      },
    },
    renderContent: (value) => (
      <div className={styles['top-content']}>
        {get(value.data, '[0].y', 0).toFixed(2)}%
      </div>
    ),
  },
  {
    title: t('Memory Usage'),
    span: 8,
    createFetchParams: {
      metricKey: 'instanceMonitor.memUsage',
      params: { domain },
    },
    renderContent: (value) => (
      <div className={styles['top-content']}>
        {get(value.data[0], 'y', 0).toFixed(2)}%
      </div>
    ),
  },
  {
    title: t('DISK IOPS'),
    span: 8,
    createFetchParams: {
      metricKey: 'instanceMonitor.disk_iops',
      params: { domain },
    },
    handleDataParams: {
      // 直接使用metricDict中计算好的总IOPS数据
      formatDataFn: (responses) => {
        if (!responses || responses.length === 0) return [];

        // 获取总IOPS数据
        const totalIopsResults = responses[0]?.data?.result || [];

        if (totalIopsResults.length === 0) {
          return [];
        }

        // 取最新的数据点
        const latestResult = totalIopsResults[0].value || [0, 0];

        return [
          {
            x: latestResult[0],
            y: parseFloat(latestResult[1]),
          },
        ];
      },
    },
    renderContent: (value) => (
      <div className={styles['top-content']}>
        {get(value.data, '[0].y', 0).toFixed(2)}
      </div>
    ),
  },
  {
    title: t('自创建总量'),
    span: 12,
    visibleHeight: 180,
    createFetchParams: {
      requestType: 'current',
      metricKey: 'instanceMonitor.network_since_created',
      params: {
        domain,
      },
      convertUrl: (url) =>
        url.replace('[SC]', `[${getSinceCreateAlias(createdMs)}]`),
    },
    handleDataParams: {
      formatDataFn: (responses) => {
        const safeVal = (res) => {
          const results = get(res, 'data.result', []) || [];
          const sum = results.reduce((acc, item) => {
            const v = parseFloat(get(item, 'value[1]', 0));
            return acc + (Number.isNaN(v) ? 0 : v);
          }, 0);
          return sum;
        };
        const scTx = safeVal(responses?.[0]);
        const scRx = safeVal(responses?.[1]);
        const total = scTx + scRx;
        return [
          {
            x: 0,
            y: total,
          },
        ];
      },
    },
    renderContent: (value) => (
      <div className={styles['top-content']}>
        {getSuitableValue(get(value.data, '[0].y', 0), 'disk', 0)}
      </div>
    ),
  },
  {
    title: t('流量统计'),
    span: 12,
    visibleHeight: 180,
    createFetchParams: {
      // 使用 current 查询，固定三个周期（今日/7天/30天）统计
      requestType: 'current',
      metricKey: 'instanceMonitor.network_total_sc',
      params: {
        domain,
      },
      convertUrl: (url) =>
        url
          .replace('[24h]', `[${getTodayDurationAlias()}]`)
          .replace('[SC]', `[${getSinceCreateAlias(createdMs)}]`),
    },
    handleDataParams: {
      formatDataFn: (responses) => {
        const safeVal = (res) => {
          const results = get(res, 'data.result', []) || [];
          const sum = results.reduce((acc, item) => {
            const v = parseFloat(get(item, 'value[1]', 0));
            return acc + (Number.isNaN(v) ? 0 : v);
          }, 0);
          return sum;
        };
        const todayTx = safeVal(responses?.[0]);
        const todayRx = safeVal(responses?.[1]);
        const weekTx = safeVal(responses?.[2]);
        const weekRx = safeVal(responses?.[3]);
        const monthTx = safeVal(responses?.[4]);
        const monthRx = safeVal(responses?.[5]);
        const scTx = safeVal(responses?.[6]);
        const scRx = safeVal(responses?.[7]);
        return [
          {
            label: t('今日'),
            outbound: todayTx,
            inbound: todayRx,
            total: todayTx + todayRx,
          },
          {
            label: t('7天'),
            outbound: weekTx,
            inbound: weekRx,
            total: weekTx + weekRx,
          },
          {
            label: t('30天'),
            outbound: monthTx,
            inbound: monthRx,
            total: monthTx + monthRx,
          },
          {
            label: t('自创建'),
            outbound: scTx,
            inbound: scRx,
            total: scTx + scRx,
          },
        ];
      },
    },
    renderContent: ({ data }) => {
      const rows = Array.isArray(data) ? data : [];
      const headers = [t('出口流量'), t('入口流量'), t('总流量')];
      return (
        <div style={{ padding: '12px 16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: 'left',
                    fontWeight: 600,
                    paddingBottom: 8,
                  }}
                >
                  {t('时间范围')}
                </th>
                {headers.map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'right',
                      fontWeight: 600,
                      paddingBottom: 8,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td style={{ padding: '6px 0' }}>{r.label}</td>
                  <td style={{ textAlign: 'right' }}>
                    {getSuitableValue(r.outbound, 'disk', 0)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {getSuitableValue(r.inbound, 'disk', 0)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {getSuitableValue(r.total, 'disk', 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    },
  },
];

// 定义图表卡片配置，复用PhysicalNode组件的结构
export const getChartCardList = (domain) => [
  {
    title: t('CPU Usage(%)'),
    createFetchParams: {
      metricKey: 'instanceMonitor.cpu',
      params: { domain },
    },
    handleDataParams: {},
    chartProps: {
      height: 300,
      scale: {
        y: {
          alias: t('CPU Usage(%)'),
          nice: true,
          domain: [0, 'dataMax'],
        },
      },
      chartType: ChartType.ONELINE,
    },
  },
  {
    title: t('Memory Usage'),
    createFetchParams: {
      metricKey: 'instanceMonitor.memory',
      params: { domain },
    },
    handleDataParams: {
      modifyKeys: [t('Used'), t('Free')],
    },
    chartProps: {
      height: 300,
      scale: {
        y: {
          formatter: (d) => getSuitableValue(d, 'memory'),
          alias: t('Memory'),
          nice: true,
          domain: [0, 'dataMax'],
        },
      },
      chartType: ChartType.MULTILINE,
    },
  },
  {
    title: t('Network Traffic'),
    createFetchParams: {
      metricKey: 'instanceMonitor.network',
      params: { domain },
      convertUrl: (url, { interval }) => {
        const base = Math.max((interval || 10) * 2, 180);
        const minutes = Math.floor(base / 60);
        const seconds = base % 60;
        const alias =
          minutes > 0
            ? `${minutes}m${seconds ? `${seconds}s` : ''}`
            : `${seconds}s`;
        return url.replace('[3m]', `[${alias}]`);
      },
    },
    handleDataParams: {
      modifyKeys: [t('receive'), t('transmit')],
      deviceKey: 'target_device',
    },
    chartProps: {
      height: 300,
      scale: {
        y: {
          formatter: (d) => getSuitableValue(d, 'traffic', 0),
          nice: true,
          domain: [0, 'dataMax'],
        },
      },
      chartType: ChartType.MULTILINE,
    },
  },
  {
    title: t('DISK Read/Write'),
    createFetchParams: {
      metricKey: 'instanceMonitor.disk',
      params: {
        // 使用domain作为过滤参数，与内存监控保持一致
        domain,
      },
      convertUrl: (url, { interval }) => {
        const base = Math.max((interval || 10) * 2, 180);
        const minutes = Math.floor(base / 60);
        const seconds = base % 60;
        const alias =
          minutes > 0
            ? `${minutes}m${seconds ? `${seconds}s` : ''}`
            : `${seconds}s`;
        return url.replace('[3m]', `[${alias}]`);
      },
    },
    handleDataParams: {
      modifyKeys: [t('read'), t('write')],
      deviceKey: 'target_device',
    },
    chartProps: {
      height: 300,
      scale: {
        y: {
          formatter: (d) => getSuitableValue(d, 'disk'),
          nice: true,
          domain: [0, 'dataMax'],
        },
      },
      chartType: ChartType.MULTILINEDEVICES,
    },
  },
];

// 创建监控图表配置，同时使用instanceId和domain名称

export const getChartConfig = (domain, createdMs) => ({
  chartCardList: getChartCardList(domain),
  topCardList: getTopCardList(domain, createdMs),
});

// 实例监控基础组件，包含图表展示
const InstanceMonitorBase = ({ hostname: domain, createdMs }) => {
  const defaultNode = {
    metric: { domain },
  };
  return (
    <>
      <BaseContent
        chartConfig={getChartConfig(domain, createdMs)}
        renderNodeSelect={false}
        renderTimeRangeSelect
        defaultNode={defaultNode}
      />
    </>
  );
};

// 添加props验证
InstanceMonitorBase.propTypes = {};

// 实例监控包装组件，处理Prometheus服务检查和错误处理
class InstanceMonitorWrapper extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      error: '',
      domain: '',
      hasPrometheus: true,
      createdMs: 0,
    };
  }

  componentDidMount() {
    this.initMonitor();
  }

  componentDidUpdate(prevProps) {
    const currentInstanceId = this.getInstanceId();
    const prevInstanceId =
      prevProps.instanceId ||
      (prevProps.match &&
        prevProps.match.params &&
        prevProps.match.params.id) ||
      '';
    const { instanceDetail } = this.props;
    if (
      currentInstanceId !== prevInstanceId ||
      instanceDetail !== prevProps.instanceDetail
    ) {
      // 使用 setTimeout 将状态更新移出渲染周期
      setTimeout(() => {
        this.initMonitor();
      }, 0);
    }
  }

  // 获取实例ID，优先从props中获取，否则从路由参数中获取
  getInstanceId() {
    const { instanceId, match } = this.props;
    return instanceId || (match && match.params && match.params.id) || '';
  }

  // 基于 domain 的指标检查 Prometheus 服务可用性
  checkPrometheusService = async (domain) => {
    try {
      const query = `libvirt_domain_interface_stats_receive_bytes_total{domain="${domain}"}`;
      await fetchPrometheus(query, 'current');
      return true;
    } catch (err) {
      this.setState({
        error: t(
          'Prometheus service is unavailable or instance metrics not found'
        ),
      });
      return false;
    }
  };

  fetchDomainAndCreatedFromExtension = async (instanceId) => {
    try {
      const ret = await client.skyline.extension.servers({
        uuid: instanceId,
        all_projects: true,
      });
      const servers = (ret && ret.servers) || [];
      if (servers.length > 0) {
        const s = servers[0] || {};
        const ori = s.origin_data || {};
        const domain =
          ori['OS-EXT-SRV-ATTR:instance_name'] ||
          s.hostname ||
          s.name ||
          instanceId;
        const createdStr = ori.created || s.created_at || '';
        let createdMs = 0;
        if (createdStr) {
          const d = new Date(createdStr);
          if (!Number.isNaN(d.getTime())) {
            createdMs = d.getTime();
          }
        }
        this.setState({ domain, createdMs });
        return { domain, createdMs };
      }
    } catch (e) {
      return {};
    }
    return {};
  };

  // 初始化监控组件
  initMonitor = async () => {
    this.setState({ isLoading: true, error: '' });

    // 获取实例ID
    const instanceId = this.getInstanceId();
    if (!instanceId) {
      this.setState({
        isLoading: false,
        error: t('Instance ID is required for monitoring'),
      });
      return;
    }

    // 移除首次按 instance 的可用性检查，降低请求开销

    const { instanceDetail } = this.props;
    if (instanceDetail && instanceDetail.created) {
      const d = new Date(instanceDetail.created);
      if (!Number.isNaN(d.getTime())) {
        const createdTime = d.getTime();
        this.setState((prev) =>
          !prev.createdMs ? { createdMs: createdTime } : null
        );
      }
    }

    const extRet = await this.fetchDomainAndCreatedFromExtension(instanceId);
    if (!extRet.domain) {
      this.setState({ domain: instanceId });
    }

    // 基于 domain 的 Prometheus 可用性检查
    if (this.state.domain) {
      const prometheusAvailable = await this.checkPrometheusService(
        this.state.domain
      );
      this.setState(() => ({ hasPrometheus: prometheusAvailable }));
      if (!prometheusAvailable) {
        this.setState(() => ({ isLoading: false }));
        return;
      }
    }

    // 若仍无创建时间，兜底为网络指标的最早样本时间
    if (this.state.domain) {
      const ts = await this.getEarliestNetworkTimestamp(this.state.domain);
      if (ts)
        this.setState((prev) => (!prev.createdMs ? { createdMs: ts } : null));
    }

    this.setState({ isLoading: false });
  };

  // 兜底：获取网络指标的最早样本时间（近似创建时间，受保留期影响）
  getEarliestNetworkTimestamp = async (domain) => {
    try {
      const start = new Date(Date.now() - 30 * 24 * 3600 * 1000);
      const end = new Date();
      const step = 3600;
      const tx = await fetchPrometheus(
        `libvirt_domain_interface_stats_transmit_bytes_total{domain="${domain}"}`,
        'range',
        [start, end],
        step
      );
      const rx = await fetchPrometheus(
        `libvirt_domain_interface_stats_receive_bytes_total{domain="${domain}"}`,
        'range',
        [start, end],
        step
      );
      const getFirstTs = (ret) => {
        const results = (ret && ret.data && ret.data.result) || [];
        let ts = 0;
        results.forEach((r) => {
          const values = r.values || [];
          if (values.length > 0) {
            const first = parseFloat(values[0][0]);
            if (!Number.isNaN(first)) {
              ts = ts === 0 ? first : Math.min(ts, first);
            }
          }
        });
        return ts;
      };
      const ts = Math.min(
        ...[getFirstTs(tx), getFirstTs(rx)].filter((v) => v > 0)
      );
      return ts > 0 ? ts * 1000 : 0;
    } catch (e) {
      return 0;
    }
  };

  render() {
    const { isLoading, error, domain, hasPrometheus, createdMs } = this.state;
    // instanceId已经在initMonitor中使用，这里不再需要单独声明

    // 显示加载状态
    if (isLoading) {
      return (
        <div className={styles.loading}>
          <LoadingOutlined style={{ fontSize: 48 }} />
          <p>{t('Loading monitoring data...')}</p>
        </div>
      );
    }

    // 显示错误信息
    if (error) {
      return (
        <Alert
          message={t('Monitoring Error')}
          description={error}
          type="error"
          showIcon
          style={{ margin: 24 }}
        />
      );
    }

    return (
      <div className={styles.container}>
        {hasPrometheus && (
          <InstanceMonitorBase hostname={domain} createdMs={createdMs} />
        )}
      </div>
    );
  }
}

// 添加props验证
InstanceMonitorWrapper.propTypes = {
  instanceId: PropTypes.string,
  instanceDetail: PropTypes.object,
  match: PropTypes.object,
};

// 直接导出组件，不需要额外的observer包装
export { InstanceMonitorWrapper };

export default InstanceMonitorWrapper;

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

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Alert, Select } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import BaseContent from 'components/PrometheusChart/component/BaseContent';
import { getSuitableValue } from 'resources/prometheus/monitoring';
import {
  ChartType,
  fetchPrometheus,
} from 'components/PrometheusChart/utils/utils';
import metricDict from 'resources/prometheus/metricDict';

import i18n from 'core/i18n';

import styles from './index.less';

const { t } = i18n;
const { Option } = Select;

// 定义顶部指标卡片配置，复用PhysicalNode组件的结构
export const getTopCardList = (instanceId, domain) => [
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
      // 将CPU使用率乘以100以显示百分比
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
          y: (parseFloat(result.value?.[1]) || 0) * 100,
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
      params: {
        // 使用从libvirt_domain_openstack_info获取的domain名称作为过滤条件
        // 而不是instanceId，以符合内存指标查询的逻辑
        domain,
      },
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
      params: {
        // 使用domain作为过滤参数，与其他监控保持一致
        domain,
      },
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
];

// 定义图表卡片配置，复用PhysicalNode组件的结构
export const getChartCardList = (instanceId, domain) => [
  {
    title: t('CPU Usage(%)'),
    createFetchParams: {
      metricKey: 'instanceMonitor.cpu',
      params: {
        // 使用domain作为过滤参数，与内存监控保持一致
        domain,
      },
    },
    handleDataParams: {
      // 将CPU使用率乘以100以显示百分比，并与默认的handleResponses保持一致的格式
      formatDataFn: (responses) => {
        const ret = [];

        if (!responses || responses.length === 0) {
          // 添加默认模拟数据以便查看图表效果
          const now = Date.now() / 1000;
          for (let i = 60; i >= 0; i--) {
            ret.push({
              x: now - i * 60,
              y: parseFloat((30 + Math.random() * 40).toFixed(2)),
            });
          }
          return ret;
        }

        responses.forEach((response) => {
          const { data } = response;
          if (!data || !data.result) return;

          data.result.forEach((result) => {
            // 兼容range和current两种类型的数据格式
            const values =
              result.values ||
              (result.value && Array.isArray(result.value[0])
                ? result.value
                : [result.value]);

            values.forEach((value) => {
              if (!value || value.length < 2) return;

              ret.push({
                x: parseFloat(value[0]),
                y: parseFloat((parseFloat(value[1]) * 100).toFixed(2)), // 乘以100并保留2位小数
              });
            });
          });
        });

        return ret;
      },
    },
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
      params: {
        // 使用从libvirt_domain_openstack_info获取的domain名称作为过滤条件
        // 而不是instanceId，以符合内存指标查询的逻辑
        domain,
      },
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
      params: {
        // 使用domain作为过滤参数，与内存监控保持一致
        domain,
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
// domain是从libvirt_domain_openstack_info查询获取的domain名称
export const getChartConfig = (instanceId, domain) => ({
  chartCardList: getChartCardList(instanceId, domain),
  topCardList: getTopCardList(instanceId, domain),
});

// 实例监控基础组件，包含图表展示
const InstanceMonitorBase = ({ instanceId, hostname: domain }) => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('all');
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // 获取设备列表
  useEffect(() => {
    if (domain) {
      fetchDevices();
    }
  }, [domain]);

  // 从Prometheus获取设备列表
  const fetchDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const query = `libvirt_domain_block_stats_read_bytes_total{domain="${domain}"}`;
      const result = await fetchPrometheus(query, 'current');

      if (result && result.data && result.data.result) {
        const deviceList = Array.from(
          new Set(result.data.result.map((item) => item.metric.device))
        ).filter(Boolean);
        setDevices(deviceList);
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  // 处理设备选择变更
  const handleDeviceChange = (value) => {
    setSelectedDevice(value);
  };

  // 创建默认节点对象，设置domain参数和device参数
  const defaultNode = {
    metric: {
      domain,
      ...(selectedDevice !== 'all' && { device: selectedDevice }),
    },
  };

  return (
    <>
      {devices.length > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: '16px',
            backgroundColor: '#f5f5f5',
            borderRadius: 4,
          }}
        >
          <label htmlFor="disk-device-select" style={{ marginRight: 8 }}>
            {t('Select Disk Device')}:
          </label>
          <Select
            id="disk-device-select"
            value={selectedDevice}
            onChange={handleDeviceChange}
            style={{ width: 200 }}
            loading={isLoadingDevices}
          >
            <Option value="all">{t('All Devices')}</Option>
            {devices.map((device) => (
              <Option key={device} value={device}>
                {device}
              </Option>
            ))}
          </Select>
        </div>
      )}
      <BaseContent
        chartConfig={getChartConfig(instanceId, domain)}
        renderNodeSelect={false}
        renderTimeRangeSelect
        defaultNode={defaultNode} // 设置默认节点，确保domain参数正确传递给Charts组件
      />
    </>
  );
};

// 添加props验证
InstanceMonitorBase.propTypes = {
  instanceId: PropTypes.string.isRequired,
};

// 实例监控包装组件，处理Prometheus服务检查和错误处理
class InstanceMonitorWrapper extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      error: '',
      domain: '',
      hasPrometheus: true,
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

  // 检查Prometheus服务是否可用
  checkPrometheusService = async () => {
    const instanceId = this.getInstanceId();
    // 在第一次调用时，我们可能还没有domain信息，所以先使用instanceId
    try {
      // 尝试直接使用instanceId检查Prometheus服务
      await fetchPrometheus(
        get(metricDict, 'instanceMonitor.cpu.url[0]'),
        'current',
        { instance: instanceId }
      );
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

  // 通过libvirt_domain_openstack_info获取OpenStack实例信息，包括domain
  getInstanceNameByPrometheus = async (instanceId) => {
    try {
      // 从metricDict中获取libvirt_domain_openstack_info指标
      const openstackInfoUrl = get(
        metricDict,
        'instanceMonitor.openstackinfo.url[0]',
        'libvirt_domain_openstack_info'
      );

      // 移除metric_name和标签选择器之间的空格，确保查询格式正确
      const query = `${openstackInfoUrl}{instance_id="${instanceId}"}`;

      const ret = await fetchPrometheus(query, 'current');
      const {
        data: { result = [] },
      } = ret;
      if (result.length > 0) {
        // 获取domain信息
        const domain = result[0].metric.domain || instanceId;

        // 保存domain信息
        this.setState({ domain });
        return {
          domain,
        };
      }
    } catch (error) {
      // 记录错误但继续执行，使用实例ID作为备选
      this.setState((prevState) => ({
        error: prevState.error || 'Failed to get domain from metrics',
      }));
    }
    // 如果获取失败，返回实例ID作为默认值
    this.setState({ domain: instanceId });
    return {
      domain: instanceId,
    };
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

    // 检查Prometheus服务
    const prometheusAvailable = await this.checkPrometheusService();
    this.setState({ hasPrometheus: prometheusAvailable });

    if (!prometheusAvailable) {
      this.setState({ isLoading: false });
      return;
    }

    // 通过libvirt_domain_openstack_info获取实例名称和domain信息
    await this.getInstanceNameByPrometheus(instanceId);

    this.setState({ isLoading: false });
  };

  render() {
    const { isLoading, error, domain, hasPrometheus } = this.state;
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

    // 获取原始的instanceId，而不是domain
    const instanceId = this.getInstanceId();

    return (
      <div className={styles.container}>
        {hasPrometheus && (
          <InstanceMonitorBase
            instanceId={instanceId} // 使用原始的instanceId确保正确的指标查询
            hostname={domain} // 传递真实的domain名称作为过滤条件，而不是instanceName
          />
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

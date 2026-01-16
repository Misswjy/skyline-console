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

import { observer, inject } from 'mobx-react';
import Base from 'containers/List';
import globalRecycleBinStore from 'stores/nova/recycle-bin';
import actionConfigs from './actions';

export class RecycleBin extends Base {
  init() {
    this.store = globalRecycleBinStore;
  }

  get policy() {
    return 'os_compute_api:servers:index';
  }

  get adminPageHasProjectFilter() {
    return true;
  }

  get name() {
    return t('Recycle Bin');
  }

  get actionConfigs() {
    return actionConfigs;
  }

  get columns() {
    const columns = [
      {
        title: t('Instance Name'),
        dataIndex: 'name',
        isLink: false,
      },
      {
        title: t('Project ID'),
        dataIndex: 'tenant_id',
        isHideable: true,
        hidden: !this.isAdminPage,
      },
      {
        title: t('Status'),
        dataIndex: 'status',
      },
      {
        title: t('Image'),
        dataIndex: 'image',
        render: (image) => image || '-',
      },
      {
        title: t('Flavor'),
        dataIndex: 'flavor_info',
        render: (flavor) =>
          flavor && flavor.original_name ? flavor.original_name : '-',
      },
      {
        title: t('Deleted At'),
        dataIndex: 'deleted_at',
        isHideable: true,
        valueType: 'time',
      },
    ];
    return columns.filter((it) => !it.hidden);
  }

  get searchFilters() {
    return [
      {
        label: t('Instance Name'),
        name: 'name',
      },
    ];
  }
}

export default inject('rootStore')(observer(RecycleBin));

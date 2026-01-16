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

import globalRecycleBinStore from 'stores/nova/recycle-bin';

export default {
  primaryActions: [],
  batchActions: [
    {
      actionType: 'restore',
      type: 'confirm',
      title: t('Restore'),
      actionName: t('Restore'),
      iconType: 'undo',
      onSubmit: (data) => {
        if (Array.isArray(data)) {
          return Promise.all(
            data.map((item) => globalRecycleBinStore.restore(item))
          );
        }
        return globalRecycleBinStore.restore(data);
      },
    },
    {
      actionType: 'forceDelete',
      type: 'confirm',
      title: t('Force Delete'),
      actionName: t('Force Delete'),
      iconType: 'delete',
      onSubmit: (data) => {
        if (Array.isArray(data)) {
          return Promise.all(
            data.map((item) => globalRecycleBinStore.forceDelete(item))
          );
        }
        return globalRecycleBinStore.forceDelete(data);
      },
    },
  ],
  rowActions: {
    firstAction: {
      actionType: 'restore',
      type: 'confirm',
      title: t('Restore'),
      actionName: t('Restore'),
      onSubmit: (item) => globalRecycleBinStore.restore(item),
    },
    moreActions: [
      {
        actionType: 'forceDelete',
        type: 'confirm',
        title: t('Force Delete'),
        actionName: t('Force Delete'),
        onSubmit: (item) => globalRecycleBinStore.forceDelete(item),
      },
    ],
  },
};

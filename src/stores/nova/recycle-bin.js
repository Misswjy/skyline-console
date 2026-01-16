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

import { action } from 'mobx';
import client from 'client';
import Base from 'stores/base';

export class RecycleBinStore extends Base {
  get client() {
    return client.nova.servers;
  }

  get mapper() {
    return (item) => {
      item.status = item.status.toLowerCase();
      if (!item.flavor_info) {
        item.flavor_info = item.flavor;
      }
      return item;
    };
  }

  listFetchByClient(params) {
    return this.skylineClient.extension.recycleServers(params);
  }

  @action
  async restore({ id }) {
    const body = {
      restore: null,
    };
    return this.client.action(id, body);
  }

  @action
  async forceDelete({ id }) {
    const body = {
      forceDelete: null,
    };
    return this.client.action(id, body);
  }
}

const globalRecycleBinStore = new RecycleBinStore();
export default globalRecycleBinStore;

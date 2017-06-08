import deepstream from 'deepstream.io-client-js';
import MaxFreq from 'max-frequency-caller';

export const statuses = deepstream.CONSTANTS.CONNECTION_STATE;

// TODO: Make Symbols out of data model parts/tags ?

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
export function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  return mergeDeep(target, ...sources);
}

export function updateDataRecord(client, id, timestamp, payload) {
  return client.record.getRecord(id).set('timestamp', timestamp).set('payload', payload);
}

export function addEntry(list, str) {
  if (list.getEntries().indexOf(str) > -1) return;
  return list.addEntry(str);
}

export default class DSClient {
  constructor(url, options, tenant = 'demo') {
    this.tenant = tenant;
    // Create deepstream client object
    this.c = deepstream(url, options);
    this.channelFreqs = {};
  }

  setTotalFrequency(freq) {
    this.maxFreq = new MaxFreq(freq);
  }

  setChannelFrequency(channel, freq) {
    this.channelFreqs[channel] = new MaxFreq(freq);
  }

  pub = (channel, payload) => {
    try {
      updateDataRecord(this.c, `${this.tenant}/data/${channel}`, Date.now() / 1000, payload);
    } catch (err) {
      console.log('Could not create data record:', err);
    }
  };

  pubSave = (channel, payload) => {
    try {
      this.pub(channel, payload);
      const listId = `${this.tenant}/history/${channel}`;
      const list = this.c.record.getList(listId);
      list.whenReady(() => {
        const timestampMs = Date.now();
        const id = `${listId}/${timestampMs}`;
        updateDataRecord(this.c, id, timestampMs / 1000, payload).whenReady(() =>
          addEntry(list, id),
        );
      });
    } catch (err) {
      console.log('Could not create history record:', err);
    }
  };

  pubFreq(channel, payload, func = this.pub) {
    if (this.maxFreq) {
      this.maxFreq(func, [channel, payload]);
    } else if (this.channelFreqs[channel]) {
      this.channelFreqs[channel](func, [channel, payload]);
    } else {
      throw new Error('No frequency set (total or channel specific)');
    }
  }

  pubFreqSave(channel, payload) {
    this.pubFreq(channel, payload, this.pubWithHistory);
  }

  getExistingRecord(pathStr) {
    return new Promise((resolve, reject) =>
      this.edc.c.record.has(pathStr, (error, hasRecord) => {
        if (error) reject(new Error(error));
        if (hasRecord) this.edc.c.record.getRecord(pathStr).whenReady(r => resolve(r));
        else reject(new Error('Record does not exist'));
      }),
    );
  }

  getExistingList(pathStr) {
    return new Promise((resolve, reject) =>
      this.edc.c.record.has(pathStr, (error, hasRecord) => {
        if (error) reject(new Error(error));
        if (hasRecord) this.edc.c.record.getList(pathStr).whenReady(l => resolve(l));
        else reject(new Error('List does not exist'));
      }),
    );
  }

  listedRecord(path, id, obj, overwrite) {
    return new Promise((resolve, reject) => {
      try {
        const rPath = [this.tenant, ...path, id || this.c.getUid()];
        const lPathStr = [this.tenant, ...path].join('/');
        const rPathStr = rPath.join('/');
        this.c.record.getRecord(rPathStr).whenReady(record => {
          this.c.record.getList(lPathStr).whenReady(list => {
            // console.log(rPathStr, list.getEntries(), rPathStr in list.getEntries());
            try {
              // Update list:
              addEntry(list, rPathStr);
              // Update record:
              let created = false;
              if (Object.keys(record.get()).length === 0) {
                record.set(obj);
                created = true;
              } else if (overwrite) {
                Object.keys(obj).forEach(key => record.set(key, obj[key]));
              } else {
                const r = record.get();
                record.set(mergeDeep(r, obj));
              }
              // Perhaps update dataType or assetType:
              if (obj.type && (path[0] === 'data' || path[0] === 'asset')) {
                const listPath = `${this.tenant}/${path[0]}Type`;
                this.c.record.getList(listPath).whenReady(types => {
                  if (obj.type.length) {
                    for (const type of obj.type) {
                      addEntry(types, type);
                    }
                  } else {
                    addEntry(types, type);
                  }
                  resolve(id, created);
                });
              } else resolve(id, created);
            } catch (err) {
              reject(err);
            }
          });
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

// ------------------------------------------------------------
//  FOR SINGLETON USE
export const eds = { client: undefined };

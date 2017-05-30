import deepstream from 'deepstream.io-client-js';
import MaxFreq from 'max-frequency-caller';

export const statuses = deepstream.CONSTANTS.CONNECTION_STATE;

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
  try {
    return client.record.getRecord(id).set('timestamp', timestamp).set('payload', payload);
  } catch (err) {
    console.log('Could not create record:', err);
    return undefined;
  }
}

export default class DSClient {
  constructor(url, options, tenant = 'demo') {
    this.tenant = tenant;
    // Create deepstream client object and tunnel its API
    this.c = deepstream(url, options);
    // this.login = this.c.login;
    // this.close = this.c.close;
    // this.getUid = this.c.getUid;
    // this.getConnectionState = this.c.getConnectionState;
    this.channelFreqs = {};
  }

  setTotalFrequency(freq) {
    this.maxFreq = new MaxFreq(freq);
  }

  setChannelFrequency(channel, freq) {
    this.channelFreqs[channel] = new MaxFreq(freq);
  }

  pub = (channel, payload) => {
    updateDataRecord(this.c, `${this.tenant}/data/${channel}`, Date.now() / 1000, payload);
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
          list.addEntry(id),
        );
      });
    } catch (err) {
      console.log('Could not create record or update list:', err);
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

  listedRecord(path, id, obj, callback, overwrite) {
    const rPath = [...path, id || this.c.getUid()];
    const rPathStr = rPath.join('/');
    this.c.record.getRecord(rPathStr).whenReady(record => {
      const list = this.c.record.getList(path.join('/'));
      list.whenReady(() => {
        if (!(rPathStr in list.getEntries())) list.addEntry(rPathStr);
        if (Object.keys(record.get()).length === 0) {
          record.set(obj);
          callback(id, true); // created=true
        } else if (overwrite) {
          Object.keys(obj).forEach(key => record.set(key, obj[key]));
          callback(id, false); // created=false
        } else {
          const r = record.get();
          Object.keys(obj).forEach(key => record.set(key, mergeDeep(r[key], obj[key])));
          callback(id, false); // created=false
        }
      });
    });
  }
}

// ------------------------------------------------------------
//  FOR SINGLETON USE
export const eds = { client: undefined };

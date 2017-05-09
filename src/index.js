import deepstream from 'deepstream.io-client-js';
import MaxFreq from 'max-frequency-caller';

export const statuses = deepstream.CONSTANTS.CONNECTION_STATE;

export function createDataRecord(client, id, timestamp, payload) {
  try {
    return client.record.getRecord(id).set({
      timestamp,
      payload,
    });
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
    this.login = this.c.login;
    this.close = this.c.close;
    this.getUid = this.c.getUid;
    this.getConnectionState = this.c.getConnectionState;
  }

  setFrequency(freq) {
    this.maxFreq = new MaxFreq(freq);
  }

  pub(channel, payload) {
    createDataRecord(this.c, `${this.tenant}/data/${channel}`, Date.now() / 1000, payload);
  }

  pubSave(channel, payload) {
    try {
      this.pub(channel, payload);
      const listId = `${this.tenant}/history/${channel}`;
      const list = this.c.record.getList(listId);
      list.whenReady(() => {
        const timestampMs = Date.now();
        const id = `${listId}/${timestampMs}`;
        createDataRecord(this.c, id, timestampMs / 1000, payload).whenReady(() =>
          list.addEntry(id));
      });
    } catch (err) {
      console.log('Could not create record or update list:', err);
    }
  }

  pubFreq(channel, payload) {
    this.maxFreq(this.pub.bind(this), [channel, payload]);
  }

  pubFreqSave(channel, payload) {
    this.maxFreq(this.pubWithHistory.bind(this), [channel, payload]);
  }
}

// ------------------------------------------------------------
//  FOR SINGLETON USE
export const eds = { client: undefined };

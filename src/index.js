import deepstream from 'deepstream.io-client-js';
import maxFreq from 'max-frequency-caller';

const ds = { client: undefined }; // client, changable & exportable

export function init(
  serverAddress,
  { tenant = 'demo', frequency = undefined, cb = Function.prototype },
) {
  ds.client = deepstream(serverAddress, cb);
  ds.tenant = tenant;
  ds.delay = 1000 / frequency;
}

export function login(loginObj, callback) {
  ds.client.login(loginObj, callback);
}

function createDataRecord(id, timestamp, payload) {
  try {
    return ds.client.record.getRecord(id).set({
      timestamp,
      payload,
    });
  } catch (err) {
    console.log('Could not create record:', err);
  }
}

export function pub(channel, payload) {
  createDataRecord(`${ds.tenant}/data/${channel}`, Date.now() / 1000, payload);
}

export function pubWithHistory(channel, payload) {
  try {
    pub(channel, payload);
    const listId = `${ds.tenant}/history/${channel}`;
    const list = ds.client.record.getList(listId);
    list.whenReady(() => {
      const timestampMs = Date.now();
      const id = `${listId}/${timestampMs}`;
      createDataRecord(id, timestampMs / 1000, payload).whenReady(() => list.addEntry(id));
    });
  } catch (err) {
    console.log('Could not create record or update list:', err);
  }
}

export function pubFreq(channel, payload) {
  if (!ds.delay) throw new Error('Must set frequency in init options');
  maxFreq(pub, [channel, payload], ds.delay);
}

export function pubFreqWithHistory(channel, payload) {
  if (!ds.delay) throw new Error('Must set frequency in init options');
  maxFreq(pubWithHistory, [channel, payload], ds.delay);
}

export const statuses = deepstream.CONSTANTS.CONNECTION_STATE;

export default ds;

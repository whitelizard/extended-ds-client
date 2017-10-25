import deepstream from 'deepstream.io-client-js';
import merge from 'lodash.merge';

export const CONSTANTS = deepstream.CONSTANTS;
export const MERGE_STRATEGIES = deepstream.MERGE_STRATEGIES;
export const statuses = deepstream.CONSTANTS.CONNECTION_STATE; // Depricated

/**
 * Add entry to a DS List (avoiding duplicates).
 * !! Always use this instead of list.addEntry !!
 * @param {Object} list Deepstream List handle
 * @param {String} str  Entry to add
 */
export function addEntry(list, str) {
  if (list.getEntries().indexOf(str) > -1) return undefined;
  return list.addEntry(str);
}

function getRecordP(name) {
  return new Promise(resolve => this.record.getRecord(name).whenReady(resolve));
}

function getListP(name) {
  return new Promise(resolve => this.record.getList(name).whenReady(resolve));
}

function getExistingP(type, pathStr) {
  return new Promise(resolve =>
    this.record.has(pathStr, (error, hasRecord) => {
      if (error) throw new Error(error);
      if (hasRecord) this.record[`get${type}`](pathStr).whenReady(r => resolve(r));
      else throw new Error(`${type} does not exist: ${pathStr}`);
    }),
  );
}

function removeFromListP(listPath, id) {
  return this.record.getExistingListP(listPath).then(l => {
    if (typeof id === 'string') l.removeEntry(id);
    else id.forEach(v => l.removeEntry(v));
    return l;
  });
}

function addToListP(listPath, id) {
  // TODO: Need to listen to the add event ??
  return this.record.getListP(listPath).then(l => {
    if (typeof id === 'string') addEntry(l, id);
    else id.forEach(v => addEntry(l, v));
    return l;
  });
}

function snapshotP(name) {
  return new Promise(resolve =>
    this.record.snapshot(name, (error, data) => {
      if (error) throw new Error(error);
      else resolve(data);
    }),
  );
}

function getListedRecordP(listPath, recordId, obj, deepMerge, overwrite) {
  const id = recordId || this.getUid();
  const rPath = `${listPath}${this.splitChar}${id}`;
  return Promise.all([
    this.record.getListP(listPath),
    this.record.getRecordP(rPath),
  ]).then(([l, r]) => {
    // Update list:
    if (this.listedRecordFullPaths) addEntry(l, rPath);
    else addEntry(l, id);
    // Update record:
    const record = r.get();
    const newRecord = { ...obj, [this.listedRecordIdKey]: id };
    if (Object.keys(record).length === 0) {
      r.set(newRecord);
    } else if (deepMerge) {
      r.set(merge(record, newRecord));
    } else if (overwrite) {
      r.set(newRecord);
    } else {
      Object.keys(newRecord).forEach(key => r.set(key, newRecord[key]));
    }
    return [l, r];
  });
}

function setListedRecordP(listPath, recordId, obj, deepMerge, overwrite) {
  return this.record.getListedRecordP(listPath, recordId, obj, deepMerge, overwrite).then(arr => {
    const id = arr[1].get()[this.listedRecordIdKey];
    arr[0].discard();
    arr[1].discard();
    return id;
  });
}

function deleteListedRecordP(listPath, recordId) {
  const rPath = `${listPath}${this.splitChar}${recordId}`;
  return Promise.all([
    this.record
      .getExistingRecordP(rPath)
      .then(r => r.delete())
      .catch(() => undefined),
    this.record.removeFromListP(listPath, this.listedRecordFullPaths ? rPath : recordId),
  ]).then(() => true);
}

function setExistingRecordP(name, obj, deepMerge, overwrite) {
  return this.record.getExistingRecordP(name).then(r => {
    if (deepMerge) {
      r.set(merge(r.get(), obj));
    } else if (overwrite) {
      r.set(obj);
    } else {
      Object.keys(obj).forEach(key => r.set(key, obj[key]));
    }
    return r;
  });
}

function loginP(authParams) {
  return new Promise(resolve =>
    this.login(authParams, (success, data) => {
      if (success) resolve(data);
      else throw new Error(data);
    }),
  );
}

function hasP(name) {
  return new Promise(resolve =>
    this.record.has(name, (error, hasRecord) => {
      if (error) throw new Error(error);
      else resolve(hasRecord);
    }),
  );
}

function makeP(name, data) {
  return new Promise(resolve =>
    this.rpc.make(name, data, (error, result) => {
      if (error) throw new Error(error);
      else resolve(result);
    }),
  );
}

function setDataP(name, path, data) {
  return new Promise(resolve =>
    this.record.setData(name, path, data, error => {
      if (error) throw new Error(error);
      else resolve();
    }),
  );
}

function deleteP(type, arg) {
  return new Promise(resolve => {
    if (typeof arg === 'string') {
      this.record
        [`getExisting${type}P`](arg) // eslint-disable-line
        .then(r => {
          r.on('delete', resolve);
          r.delete();
        })
        .catch(() => resolve());
    } else {
      arg.on('delete', resolve);
      arg.delete();
    }
  });
}

export function polyfill(obj, key, value) {
  if (typeof obj[key] === 'undefined') {
    // eslint-disable-next-line
    obj[key] = value;
  }
}

export default function getClient(url, options) {
  const c = deepstream(url, options);

  c.listedRecordFullPaths =
    options && options.listedRecordFullPaths !== undefined ? options.listedRecordFullPaths : true;
  c.listedRecordIdKey =
    options && options.listedRecordIdKey !== undefined ? options.listedRecordIdKey : 'id';
  c.splitChar = options && options.splitChar !== undefined ? options.splitChar : '/';

  polyfill(c, 'loginP', loginP.bind(c));
  polyfill(c.rpc, 'makeP', makeP.bind(c));
  polyfill(c.record, 'getRecordP', getRecordP.bind(c));
  polyfill(c.record, 'getListP', getListP.bind(c));
  polyfill(c.record, 'setDataP', setDataP.bind(c));
  polyfill(c.record, 'snapshotP', snapshotP.bind(c));
  polyfill(c.record, 'hasP', hasP.bind(c));
  polyfill(c.record, 'getExistingRecordP', getExistingP.bind(c, 'Record'));
  polyfill(c.record, 'getExistingListP', getExistingP.bind(c, 'List'));
  polyfill(c.record, 'deleteRecordP', deleteP.bind(c, 'Record'));
  polyfill(c.record, 'deleteListP', deleteP.bind(c, 'List'));
  polyfill(c.record, 'setExistingRecordP', setExistingRecordP.bind(c));
  polyfill(c.record, 'addToListP', addToListP.bind(c));
  polyfill(c.record, 'removeFromListP', removeFromListP.bind(c));
  polyfill(c.record, 'getListedRecordP', getListedRecordP.bind(c));
  polyfill(c.record, 'setListedRecordP', setListedRecordP.bind(c));
  polyfill(c.record, 'deleteListedRecordP', deleteListedRecordP.bind(c));

  polyfill(c.record, 'removeListedRecordP', c.deleteListedRecordP); // Alias, backward comp.

  const rootP = {
    login: c.loginP,
  };
  polyfill(c, 'p', rootP);
  const rpcP = {
    make: c.rpc.makeP,
  };
  polyfill(c.rpc, 'p', rpcP);
  const recordP = {
    getRecord: c.record.getRecordP,
    getList: c.record.getListP,
    setData: c.record.setDataP,
    snapshot: c.record.snapshotP,
    has: c.record.hasP,
    getExistingRecord: c.record.getExistingRecordP,
    getExistingList: c.record.getExistingListP,
    deleteRecord: c.record.deleteRecordP,
    deleteList: c.record.deleteListP,
    setExistingRecord: c.record.setExistingRecordP,
    addToList: c.record.addToListP,
    removeFromList: c.record.removeFromListP,
    getListedRecord: c.record.getListedRecordP,
    setListedRecord: c.record.setListedRecordP,
    deleteListedRecord: c.record.deleteListedRecordP,
    removeListedRecord: c.record.deleteListedRecordP, // Alias, backward comp.
  };
  polyfill(c.record, 'p', recordP);

  return c;
}

// ------------------------------------------------------------
//  FOR SINGLETON USE
export const ds = { client: undefined };

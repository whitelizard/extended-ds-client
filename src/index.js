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
  return new Promise(resolve => this.record.getRecord(name).whenReady(r => resolve(r)));
}

function getListP(name) {
  return new Promise(resolve => this.record.getList(name).whenReady(r => resolve(r)));
}

function getExistingP(type, pathStr) {
  return new Promise((resolve, reject) =>
    this.record.has(pathStr, (error, hasRecord) => {
      if (error) reject(new Error(error));
      if (hasRecord) this.record[`get${type}`](pathStr).whenReady(r => resolve(r));
      else reject(new Error(`${type} does not exist: ${pathStr}`));
    }),
  );
}

function removeFromListP(listPath, id) {
  return this.record.getExistingListP(listPath).then(l => {
    l.removeEntry(id);
    return l;
  });
}

function addToListP(listPath, id) {
  return this.record.getExistingListP(listPath).then(l => {
    addEntry(l, id);
    return l;
  });
}

function snapshotP(name) {
  return new Promise((resolve, reject) =>
    this.record.snapshot(name, (error, data) => {
      if (error) reject(new Error(error));
      else resolve(data);
    }),
  );
}

function setListedRecordP(listPath, recordId, obj, deepMerge, overwrite, fullPathList = true) {
  const id = recordId || this.getUid();
  const rPath = `${listPath}/${id}`;
  return Promise.all([
    this.record.getRecordP(rPath),
    this.record.getListP(listPath),
  ]).then(([r, l]) => {
    // Update list:
    if (fullPathList) addEntry(l, rPath);
    else addEntry(l, id);
    // Update record:
    let created = false;
    const record = r.get();
    const newRecord = { ...obj, id: recordId };
    if (Object.keys(record).length === 0) {
      r.set(newRecord);
      created = true;
    } else if (deepMerge) {
      r.set(merge(record, obj));
    } else if (overwrite) {
      r.set(newRecord);
    } else {
      Object.keys(newRecord).forEach(key => r.set(key, newRecord[key]));
    }
    return [id, created];
  });
}

function setExistingRecordP(name, obj, deepMerge, overwrite) {
  return this.record.getExistingRecordP(name).then(r => {
    if (deepMerge) {
      const record = r.get();
      r.set(merge(record, obj));
    } else if (overwrite) {
      r.set(obj);
    } else {
      Object.keys(obj).forEach(key => r.set(key, obj[key]));
    }
    return r;
  });
}

function loginP(authParams) {
  return new Promise((resolve, reject) =>
    this.login(authParams, (success, data) => {
      if (success) resolve(data);
      else reject(new Error(data));
    }),
  );
}

function hasP(name) {
  return new Promise((resolve, reject) =>
    this.record.has(name, (error, hasRecord) => {
      if (error) reject(new Error(error));
      else resolve(hasRecord);
    }),
  );
}

function makeP(name, data) {
  return new Promise((resolve, reject) =>
    this.rpc.make(name, data, (error, result) => {
      if (error) reject(new Error(error));
      else resolve(result);
    }),
  );
}

export function polyfill(obj, key, value) {
  if (typeof obj[key] === 'undefined') {
    // eslint-disable-next-line
    obj[key] = value;
  }
}

export default function getClient(url, options) {
  const c = deepstream(url, options);
  polyfill(c.record, 'getRecordP', getRecordP.bind(c));
  polyfill(c.record, 'getListP', getListP.bind(c));
  polyfill(c.record, 'getExistingRecordP', getExistingP.bind(c, 'Record'));
  polyfill(c.record, 'getExistingListP', getExistingP.bind(c, 'List'));
  polyfill(c.record, 'setExistingRecordP', setExistingRecordP.bind(c));
  polyfill(c.record, 'snapshotP', snapshotP.bind(c));
  polyfill(c.record, 'hasP', hasP.bind(c));
  polyfill(c.record, 'addToListP', addToListP.bind(c));
  polyfill(c.record, 'removeFromListP', removeFromListP.bind(c));
  polyfill(c.record, 'setListedRecordP', setListedRecordP.bind(c));
  polyfill(c, 'loginP', loginP.bind(c));
  polyfill(c.rpc, 'makeP', makeP.bind(c));

  // Depricated methods
  polyfill(c.record, 'getListedRecordP', () => {
    throw new Error('use setListedRecordP instead of getListedRecordP');
  });
  polyfill(c.record, 'listedRecordP', () => {
    throw new Error('use setListedRecordP instead of listedRecordP');
  });
  return c;
}

function withTenant(func, name, ...args) {
  return this.record[func](`${this.getTenant()}/${name}`, ...args);
}

export function getClientWithTenant(url, options, tenant = 'demo') {
  const c = getClient(url, options);
  polyfill(
    c,
    'getTenant',
    function () {
      return this;
    }.bind(tenant),
  ); // non-closure getter
  polyfill(c.record, 'getRecordPT', withTenant.bind(c, 'getRecordP'));
  // polyfill(c.record, 'getRecordT', withTenant.bind(c, 'getRecord'));
  polyfill(c.record, 'getListPT', withTenant.bind(c, 'getListP'));
  // polyfill(c.record, 'getListT', withTenant.bind(c, 'getList'));
  polyfill(c.record, 'snapshotPT', withTenant.bind(c, 'snapshotP'));
  // polyfill(c.record, 'snapshotT', withTenant.bind(c, 'snapshot'));
  polyfill(c.record, 'hasPT', withTenant.bind(c, 'hasP'));
  // polyfill(c.record, 'hasT', withTenant.bind(c, 'has'));
  polyfill(c.record, 'addToListPT', withTenant.bind(c, 'addToListP'));
  polyfill(c.record, 'removeFromListPT', withTenant.bind(c, 'removeFromListP'));
  polyfill(
    c.record,
    'removeFromListPTT',
    function (name, id) {
      return this.record.removeFromListP(
        `${this.getTenant()}/${name}`,
        `${this.getTenant()}/${id}`,
      );
    }.bind(c),
  );
  polyfill(c.record, 'getExistingRecordPT', withTenant.bind(c, 'getExistingRecordP'));
  polyfill(c.record, 'getExistingListPT', withTenant.bind(c, 'getExistingListP'));
  polyfill(c.record, 'setListedRecordPT', withTenant.bind(c, 'setListedRecordP'));
  polyfill(c.record, 'setExistingRecordPT', withTenant.bind(c, 'setExistingRecordP'));
  polyfill(
    c.rpc,
    'makePT',
    function (name, data) {
      return this.rpc.makeP(`${this.getTenant()}/${name}`, data);
    }.bind(c),
  );

  // Depricated methods
  polyfill(c.record, 'getListedRecordPT', () => {
    throw new Error('use setListedRecordPT instead of getListedRecordPT');
  });
  polyfill(c.record, 'listedRecordPT', () => {
    throw new Error('use setListedRecordPT instead of listedRecordPT');
  });
  return c;
}

// ------------------------------------------------------------
//  FOR SINGLETON USE
export const ds = { client: undefined };

import 'babel-polyfill';
import deepstream from 'deepstream.io-client-js';
import merge from 'lodash.merge';
import mergeWith from 'lodash.mergewith';
import isObject from 'lodash.isobject';

export const { CONSTANTS } = deepstream;
export const { MERGE_STRATEGIES } = deepstream;
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

function loginP(authParams) {
  return new Promise((resolve, reject) =>
    this.login(authParams, (success, data) => {
      if (success) resolve(data);
      else reject(new Error(data));
    }));
}

function getRecordP(name) {
  return new Promise(resolve => this.record.getRecord(name).whenReady(resolve));
}

function getListP(name) {
  return new Promise(resolve => this.record.getList(name).whenReady(resolve));
}

function hasP(name, invert) {
  return new Promise((resolve, reject) =>
    this.record.has(name, (error, hasRecord) => {
      if (!error && (invert ? !hasRecord : hasRecord)) resolve();
      else reject(new Error(error || `Record does ${invert ? '' : 'not'} exist`));
    }));
}

function snapshotP(name) {
  return new Promise((resolve, reject) =>
    this.record.snapshot(name, (error, data) => {
      if (!error) resolve(data);
      else reject(new Error(error));
    }));
}

function setDataP(name, path, data) {
  return new Promise((resolve, reject) =>
    this.record.setData(name, path, data, error => {
      if (!error) resolve();
      else reject(new Error(error));
    }));
}

function makeP(name, data) {
  return new Promise((resolve, reject) =>
    this.rpc.make(name, data, (error, result) => {
      if (!error) resolve(result);
      else reject(new Error(error));
    }));
}

function getExistingP(type, pathStr) {
  return this.record.hasP(pathStr).then(() => this.record[`get${type}P`](pathStr));
}

// function setExistingRecordP(name, obj, deepMerge, overwrite, deepMergeCustomizer) {
//   // TODO: Remove in future release
//   return this.record.getExistingRecordP(name).then(r => {
//     if (deepMerge) {
//       const record = r.get();
//       if (deepMergeCustomizer) r.set(mergeWith(record, obj, deepMergeCustomizer));
//       else r.set(merge(record, obj));
//     } else if (overwrite) {
//       r.set(obj);
//     } else {
//       Object.keys(obj).forEach(key => r.set(key, obj[key]));
//     }
//     return r;
//   });
// }

function addToListP(listPath, id) {
  // TODO: Need to listen to the add event ??
  return this.record.getListP(listPath).then(l => {
    if (typeof id === 'string') addEntry(l, id);
    else id.forEach(v => addEntry(l, v));
    return l;
  });
}

function removeFromListP(listPath, id) {
  return this.record.getListP(listPath).then(l => {
    if (typeof id === 'string') l.removeEntry(id);
    else id.forEach(v => l.removeEntry(v));
    return l;
  });
}

function deleteP(type, arg) {
  return new Promise(resolve => {
    if (typeof arg === 'string') {
      this.record[`getExisting${type}P`](arg) // eslint-disable-line
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
// deepConcat: [{a:1}], [{a:2}] -> [{a:2}] | [1,2], [3] -> [1,2,3]
const concatFunc = (d, s) => {
  if (Array.isArray(d) && d.every(v => !isObject(v) && !Array.isArray(v))) return d.concat(s);
  return undefined;
};

// deepConcatAll: [{a:1}], [{a:2}] -> [{a:1},{a:2}] | [1,2], [3] -> [1,2,3]
const concatAllFunc = (d, s) => (Array.isArray(d) ? d.concat(s) : undefined);

// deepIgnore: [{a:0},{a:1}], ['%IGNORE%', {a:2}] -> [{a:0},{a:2}] | [1,2], ['%IGNORE%',3] -> [1,3]
const ignoreFunc = (d, s) => (s === '%IGNORE%' ? d : undefined);

// deepConcatIgnore:
// [{a:0},{a:1}], ['%IGNORE%', {a:2}] -> [{a:0},{a:2}] | [1,2], [4,3] -> [1,2,4,3]
const concatIgnoreFunc = (d, s) => {
  if (Array.isArray(d) && d.every(v => !isObject(v) && !Array.isArray(v))) {
    return d.concat(s);
  }
  return s === '%IGNORE%' ? d : undefined;
};

const updateModes = {
  overwrite: undefined,
  shallow: undefined,
  deep: undefined,
  deepConcat: concatFunc,
  deepConcatAll: concatAllFunc,
  deepIgnore: ignoreFunc,
  deepConcatIgnore: concatIgnoreFunc,
  removeKeys: undefined,
}; // removeKeys ?

// function _$updateRecordShallow(name, obj, lockedKeys = []) {
//   return Promise.all(
//     Object.entries(obj).reduce((promises, [key, value]) => {
//       if (!lockedKeys.includes(key)) {
//         promises.push(this.record.setDataP(name, key, value));
//       }
//       return promises;
//     }, []),
//   ).then(() => undefined);
// }
// NOTE: Temporary solution to dodge deepstream bug where consecutive setData overwrites callbacks
//       Property updates are made sequential instead of in parallel
async function _$updateRecordShallow(name, obj, lockedKeys = []) {
  for (const [key, value] of Object.entries(obj)) {
    if (!lockedKeys.includes(key)) {
      // eslint-disable-next-line
      await this.record.setDataP(name, key, value);
    }
  }
}

function _$updateRecordOverwrite(name, obj, lockedKeys = [], protectedKeys = []) {
  if (lockedKeys.length + protectedKeys.length === 0) {
    return this.record.setDataP(name, obj);
  }
  return this.record.getRecordP(name).then(r => {
    const record = r.get();
    lockedKeys.forEach(k => {
      if (record[k] !== undefined) obj[k] = record[k];
    });
    protectedKeys.forEach(k => {
      if (obj[k] === undefined && record[k] !== undefined) obj[k] = record[k];
    });
    r.set(obj);
    r.discard();
    return undefined;
  });
}

function _$updateRecordRemoveKeys(name, obj, lockedKeys = [], protectedKeys = []) {
  return this.record.getRecordP(name).then(r => {
    const record = r.get();
    obj.forEach(k => {
      if (!lockedKeys.includes(k) && !protectedKeys.includes(k)) {
        delete record[k];
      }
    });
    r.set(record);
    r.discard();
    return undefined;
  });
}

function _$updateRecordDeep(name, obj, mode = 'deep', lockedKeys = []) {
  return this.record.getRecordP(name).then(r => {
    const record = r.get();
    const mergeFunc = updateModes[mode];
    let newR;
    const objKeys = Object.keys(obj);
    lockedKeys.forEach(k => {
      if (objKeys.includes(k)) delete obj[k];
    });
    if (mergeFunc) newR = mergeWith({ ...record }, obj, mergeFunc);
    else newR = merge({ ...record }, obj);
    r.set(newR);
    r.discard();
    return undefined;
  });
}

// should never be called externally since it is undefined what happens if record does not exist
function _$updateRecord(name, obj, mode = 'shallow', lockedKeys = [], protectedKeys = []) {
  if (!Object.keys(updateModes).includes(mode)) throw new TypeError('Unsupported mode');
  lockedKeys.push(this.datasetRecordIdKey);
  if (mode === 'shallow') {
    return this.record._$updateRecordShallowP(name, obj, lockedKeys);
  } else if (mode === 'overwrite') {
    return this.record._$updateRecordOverwriteP(name, obj, lockedKeys, protectedKeys);
  } else if (mode === 'removeKeys') {
    return this.record._$updateRecordRemoveKeysP(name, obj, lockedKeys, protectedKeys);
  }
  return this.record._$updateRecordDeepP(name, obj, mode, lockedKeys);
}

function updateExistingRecord(
  name,
  updates,
  mode = 'shallow',
  lockedKeys = [],
  protectedKeys = [],
) {
  return this.record
    .hasP(name)
    .then(() => this.record._$updateRecordP(name, updates, mode, lockedKeys, protectedKeys));
}

function getDatasetRecord(listPath, recordId, initiation = {}) {
  const id = recordId || this.getUid();
  const rPath = `${listPath}${this.splitChar}${id}`;
  return Promise.all([this.record.getListP(listPath), this.record.getRecordP(rPath)]).then(([l, r]) => {
    // Update list:
    if (this.datasetRecordFullPaths) addEntry(l, rPath);
    else addEntry(l, id);
    // Update record:
    if (Object.keys(r.get()).length === 0) {
      r.set({ [this.datasetRecordIdKey]: id, ...initiation });
    }
    return [l, r];
  });
}

function deleteDatasetRecord(listPath, recordId) {
  const rPath = `${listPath}${this.splitChar}${recordId}`;
  return Promise.all([
    this.record
      .getExistingRecordP(rPath)
      .then(r => r.delete())
      .catch(() => undefined),
    this.record.removeFromListP(listPath, this.datasetRecordFullPaths ? rPath : recordId),
  ]).then(arr => arr[1]);
}

// function subIfNot(name, callback) {
//   if (this.event.emitter.eventNames().includes(name)) return undefined;
//   return this.event.subscribe(name, callback);
// }

function getObservable(name) {
  Observable.create(observer => {});
}

export function polyfill(obj, key, value) {
  if (typeof obj[key] === 'undefined') {
    // eslint-disable-next-line
    obj[key] = value;
  }
}

export default function getClient(url, options) {
  const c = deepstream(url, options);

  c.splitChar = options && options.splitChar !== undefined ? options.splitChar : '/';
  c.datasetRecordFullPaths =
    options && options.datasetRecordFullPaths !== undefined ? options.datasetRecordFullPaths : true;
  c.datasetRecordIdKey =
    options && options.datasetRecordIdKey !== undefined ? options.datasetRecordIdKey : 'id';

  const pf = polyfill;
  pf(c, 'loginP', loginP.bind(c));
  pf(c.rpc, 'makeP', makeP.bind(c));
  pf(c.record, 'getRecordP', getRecordP.bind(c));
  pf(c.record, 'getListP', getListP.bind(c));
  pf(c.record, 'setDataP', setDataP.bind(c));
  pf(c.record, 'snapshotP', snapshotP.bind(c));
  pf(c.record, 'hasP', hasP.bind(c));
  pf(c.record, 'getExistingRecordP', getExistingP.bind(c, 'Record'));
  pf(c.record, 'getExistingListP', getExistingP.bind(c, 'List'));
  pf(c.record, 'deleteRecordP', deleteP.bind(c, 'Record'));
  pf(c.record, 'deleteListP', deleteP.bind(c, 'List'));
  pf(c.record, 'addToListP', addToListP.bind(c));
  pf(c.record, 'removeFromListP', removeFromListP.bind(c));

  pf(c.record, '_$updateRecordShallowP', _$updateRecordShallow.bind(c));
  pf(c.record, '_$updateRecordOverwriteP', _$updateRecordOverwrite.bind(c));
  pf(c.record, '_$updateRecordRemoveKeysP', _$updateRecordRemoveKeys.bind(c));
  pf(c.record, '_$updateRecordDeepP', _$updateRecordDeep.bind(c));
  pf(c.record, '_$updateRecordP', _$updateRecord.bind(c));
  pf(c.record, 'updateExistingRecordP', updateExistingRecord.bind(c));
  pf(c.record, 'getDatasetRecordP', getDatasetRecord.bind(c));
  pf(c.record, 'deleteDatasetRecordP', deleteDatasetRecord.bind(c));

  pf(c.event, 'o', getObservable.bind(c));

  // pf(c.event, 'subIfNot', subIfNot.bind(c));

  const rootP = {
    login: c.loginP,
  };
  pf(c, 'p', rootP);
  const rpcP = {
    make: c.rpc.makeP,
  };
  pf(c.rpc, 'p', rpcP);
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
    _$updateRecordShallow: c.record._$updateRecordShallowP,
    _$updateRecordOverwrite: c.record._$updateRecordOverwriteP,
    _$updateRecordRemoveKeys: c.record._$updateRecordRemoveKeysP,
    _$updateRecordDeep: c.record._$updateRecordDeepP,
    _$updateRecord: c.record._$updateRecordP,
    updateExistingRecord: c.record.updateExistingRecordP,
    getDatasetRecord: c.record.getDatasetRecordP,
    deleteDatasetRecord: c.record.deleteDatasetRecordP,
  };
  pf(c.record, 'p', recordP);

  return c;
}

// ------------------------------------------------------------
//  FOR SINGLETON USE
export const ds = { client: undefined };

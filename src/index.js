import deepstream from 'deepstream.io-client-js';
import merge from 'lodash.merge';
import mergeWith from 'lodash.mergewith';
import isObject from 'lodash.isobject';

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

function loginP(authParams) {
  return new Promise((resolve, reject) =>
    this.login(authParams, (success, data) => {
      if (success) resolve(data);
      else reject(new Error(data));
    }),
  );
}

function getRecordP(name) {
  return new Promise(resolve => this.record.getRecord(name).whenReady(resolve));
}

function getListP(name) {
  return new Promise(resolve => this.record.getList(name).whenReady(resolve));
}

function hasP(name) {
  return new Promise((resolve, reject) =>
    this.record.has(name, (error, hasRecord) => {
      if (!error && hasRecord) resolve();
      else reject(new Error(error ? error : 'Record does not exist'));
    }),
  );
}

function snapshotP(name) {
  return new Promise((resolve, reject) =>
    this.record.snapshot(name, (error, data) => {
      if (!error) resolve(data);
      else reject(new Error(error));
    }),
  );
}

function setDataP(name, path, data) {
  return new Promise((resolve, reject) =>
    this.record.setData(name, path, data, error => {
      if (!error) resolve();
      else reject(new Error(error));
    }),
  );
}

function makeP(name, data) {
  return new Promise((resolve, reject) =>
    this.rpc.make(name, data, (error, result) => {
      if (!error) resolve(result);
      else reject(new Error(error));
    }),
  );
}

function getExistingP(type, pathStr) {
  return this.record.hasP(pathStr).then(() => this.record[`get${type}P`](pathStr));
}

function setExistingRecordP(name, obj, deepMerge, overwrite, deepMergeCustomizer) {
  // TODO: use setData for overwrite and shallow
  return this.record.getExistingRecordP(name).then(r => {
    if (deepMerge) {
      const record = r.get();
      if (deepMergeCustomizer) r.set(mergeWith(record, obj, deepMergeCustomizer));
      else r.set(merge(record, obj));
    } else if (overwrite) {
      r.set(obj);
    } else {
      Object.keys(obj).forEach(key => r.set(key, obj[key]));
    }
    return r;
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

function updateRecord(name, obj, mode = 'shallow', lockedKeys = [], protectedKeys = []) {
  if (!Object.keys(updateModes).includes(mode)) throw new TypeError('Unsupported mode');
  return this.record.hasP(name).then(() => {
    lockedKeys.push(this.listedRecordIdKey);
    if (mode === 'shallow') {
      return Promise.all(
        Object.entries(obj).reduce((promises, [key, value]) => {
          if (!lockedKeys.includes(key)) {
            promises.push(this.record.setDataP(name, key, value));
          }
          console.log(promises);
          return promises;
        }, []),
      ).then(() => undefined);
    } else if (mode === 'overwrite') {
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
    } else if (mode === 'removeKeys') {
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
    return this.record.getRecordP(name).then(r => {
      const record = r.get();
      const mergeFunc = updateModes[mode];
      let newR;
      if (mergeFunc) newR = mergeWith(record, obj, mergeFunc);
      else newR = merge(record, obj);
      lockedKeys.forEach(k => {
        if (record[k] !== undefined) newR[k] = record[k];
      });
      protectedKeys.forEach(k => {
        if (newR[k] === undefined && record[k] !== undefined) newR[k] = record[k];
      });
      r.set(newR);
      r.discard();
      return undefined;
    });
  });
}

function getListedRecordP(
  listPath,
  recordId,
  obj,
  deepMerge,
  overwrite,
  deepMergeCustomizer,
  lockedKeys,
) {
  const id = recordId || this.getUid();
  const rPath = `${listPath}${this.splitChar}${id}`;
  return Promise.all([this.record.getListP(listPath), this.record.getRecordP(rPath)]).then(
    ([l, r]) => {
      // Update list:
      if (this.listedRecordFullPaths) addEntry(l, rPath);
      else addEntry(l, id);
      // Update record:
      const record = r.get();
      const newRecord = { ...obj, [this.listedRecordIdKey]: id };
      if (Object.keys(record).length === 0) {
        r.set(newRecord);
      } else if (deepMerge) {
        if (deepMergeCustomizer) r.set(mergeWith(record, newRecord, deepMergeCustomizer));
        else r.set(merge(record, newRecord));
      } else if (overwrite) {
        r.set(newRecord);
      } else {
        Object.keys(newRecord).forEach(key => r.set(key, newRecord[key]));
      }
      return [l, r];
    },
  );
}

function setListedRecordP(
  listPath,
  recordId,
  obj,
  deepMerge,
  overwrite,
  deepMergeCustomizer,
  lockedKeys,
) {
  return this.record
    .getListedRecordP(
      listPath,
      recordId,
      obj,
      deepMerge,
      overwrite,
      deepMergeCustomizer,
      lockedKeys,
    )
    .then(arr => {
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
  ]).then(arr => arr[1]);
}

// function subIfNot(name, callback) {
//   if (this.event.emitter.eventNames().includes(name)) return undefined;
//   return this.event.subscribe(name, callback);
// }

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
  polyfill(c.record, 'updateRecordP', updateRecord.bind(c));
  // polyfill(c.event, 'subIfNot', subIfNot.bind(c));

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
    updateRecord: c.record.updateRecordP,
    removeListedRecord: c.record.deleteListedRecordP, // Alias, backward comp.
  };
  polyfill(c.record, 'p', recordP);

  return c;
}

// ------------------------------------------------------------
//  FOR SINGLETON USE
export const ds = { client: undefined };

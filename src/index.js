import deepstream from 'deepstream.io-client-js';

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

export function addEntry(list, str) {
  if (list.getEntries().indexOf(str) > -1) return;
  return list.addEntry(str);
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

function getRecordP(name) {
  return new Promise(resolve => this.record.getRecord(name).whenReady(r => resolve(r)));
}

function snapshotP(name) {
  return new Promise((resolve, reject) =>
    this.record.snapshot(name, (error, data) => {
      if (error) reject(new Error(error));
      else resolve(data);
    }),
  );
}

function listedRecordP(listPath, recordId, obj, overwrite) {
  const id = recordId || this.getUid();
  const rPath = `${listPath}/${id}`;
  return Promise.all([
    this.record.getRecordP(rPath),
    this.record.getListP(listPath),
  ]).then(([record, list]) => {
    try {
      // Update list:
      addEntry(list, rPath);
      // Update record:
      let created = false;
      const r = record.get();
      if (Object.keys(r).length === 0) {
        record.set(obj);
        created = true;
      } else if (overwrite) {
        Object.keys(obj).forEach(key => record.set(key, obj[key]));
      } else {
        record.set(mergeDeep(r, obj));
      }
      Promise.resolve([id, created]);
    } catch (err) {
      Promise.reject(err);
    }
  });
}

export default function getClient(url, options) {
  const c = deepstream(url, options);
  c.record.getRecordP = getRecordP.bind(c);
  c.record.getExistingRecordP = getExistingP.bind(c, 'Record');
  c.record.getExistingListP = getExistingP.bind(c, 'List');
  c.record.snapshotP = snapshotP.bind(c);
  c.record.listedRecordP = listedRecordP.bind(c);
  return c;
}

function withTenant(func, name, ...args) {
  return this.record[func](`${this.getTenant()}/${name}`, ...args);
}

export function getClientWithTenant(url, options, tenant = 'demo') {
  const c = getClient(url, options);
  c.getTenant = function () {
    return this;
  }.bind(tenant); // non-closure getter
  c.record.getRecordPT = withTenant.bind(c, 'getRecordP');
  c.record.getExistingRecordPT = withTenant.bind(c, 'getExistingRecordP');
  c.record.getExistingListPT = withTenant.bind(c, 'getExistingListP');
  c.record.snapshotPT = withTenant.bind(c, 'snapshotP');
  c.record.listedRecordPT = withTenant.bind(c, 'listedRecordP');
  return c;
}

// ------------------------------------------------------------
//  FOR SINGLETON USE
export const ds = { client: undefined };

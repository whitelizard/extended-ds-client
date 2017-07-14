import deepstream from 'deepstream.io-client-js';
import merge from 'lodash.merge';

export const statuses = deepstream.CONSTANTS.CONNECTION_STATE;

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

function snapshotP(name) {
  return new Promise((resolve, reject) =>
    this.record.snapshot(name, (error, data) => {
      if (error) reject(new Error(error));
      else resolve(data);
    }),
  );
}

function listedRecordP(listPath, recordId, obj, deepMerge, overwrite) {
  const id = recordId || this.getUid();
  const rPath = `${listPath}/${id}`;
  return Promise.all([
    this.record.getRecordP(rPath),
    this.record.getListP(listPath),
  ]).then(([record, list]) => {
    // Update list:
    addEntry(list, rPath);
    // Update record:
    let created = false;
    const r = record.get();
    const newRecord = { id: recordId, ...obj };
    if (Object.keys(r).length === 0) {
      record.set(newRecord);
      created = true;
    } else if (deepMerge) {
      record.set(merge(r, obj));
    } else if (overwrite) {
      record.set(newRecord);
    } else {
      Object.keys(newRecord).forEach(key => record.set(key, newRecord[key]));
    }
    return [id, created];
  });
}

function setExistingRecordP(name, obj, deepMerge, overwrite) {
  return this.record.getExistingRecordP(name).then(record => {
    if (deepMerge) {
      const r = record.get();
      record.set(merge(r, obj));
    } else if (overwrite) {
      record.set(obj);
    } else {
      Object.keys(obj).forEach(key => record.set(key, obj[key]));
    }
    return record;
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

export default function getClient(url, options) {
  const c = deepstream(url, options);
  c.record.getRecordP = getRecordP.bind(c);
  c.record.getListP = getListP.bind(c);
  c.record.getExistingRecordP = getExistingP.bind(c, 'Record');
  c.record.getExistingListP = getExistingP.bind(c, 'List');
  c.record.setExistingRecordP = setExistingRecordP.bind(c);
  c.record.snapshotP = snapshotP.bind(c);
  c.record.hasP = hasP.bind(c);
  c.record.listedRecordP = listedRecordP.bind(c);
  c.loginP = loginP.bind(c);
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
  c.record.getRecordT = withTenant.bind(c, 'getRecord');
  c.record.getListPT = withTenant.bind(c, 'getListP');
  c.record.getListT = withTenant.bind(c, 'getList');
  c.record.snapshotPT = withTenant.bind(c, 'snapshotP');
  c.record.snapshotT = withTenant.bind(c, 'snapshot');
  c.record.hasPT = withTenant.bind(c, 'hasP');
  c.record.hasT = withTenant.bind(c, 'has');
  c.record.getExistingRecordPT = withTenant.bind(c, 'getExistingRecordP');
  c.record.getExistingListPT = withTenant.bind(c, 'getExistingListP');
  c.record.listedRecordPT = withTenant.bind(c, 'listedRecordP');
  c.record.setExistingRecordPT = withTenant.bind(c, 'setExistingRecordP');
  return c;
}

// ------------------------------------------------------------
//  FOR SINGLETON USE
export const ds = { client: undefined };

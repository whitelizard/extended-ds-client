import test from 'blue-tape';
import Deepstream from 'deepstream.io';
import getClient, { addEntry } from '../src/index';

const server = new Deepstream();
server.start();
const c = getClient('localhost:6020');

test('loginP', t => c.loginP({}));
test('provide', t => {
  c.rpc.provide('rpc1', (err, res) => res.send(5));
  t.end();
});
test('getRecordP', t =>
  c.record.getRecordP('record1').then(r => {
    if (Object.keys(r.get()).length !== 0) throw Error('Not empty object');
    r.set({ name: 'Record1', data: { a: 1 } });
    return true;
  }));
test('getListP', t =>
  c.record.getListP('list1').then(l => {
    if (l.getEntries().length !== 0) throw Error('Not empty list');
    addEntry(l, 'record1');
    return true;
  }));
test('getExistingRecordP', t =>
  c.record.getExistingRecordP('record1').then(r => {
    if (r.get().name !== 'Record1') throw Error('Bad record');
    return true;
  }));
test('getExistingListP', t =>
  c.record.getExistingListP('list1').then(l => {
    if (l.getEntries()[0] !== 'record1') throw Error('Bad list');
    return true;
  }));
test('addToListP', t =>
  c.record.addToListP('list1', 'record2').then(l => {
    if (l.getEntries()[1] !== 'record2') throw Error('Bad list');
    return true;
  }));
test('removeFromListP', t =>
  c.record.removeFromListP('list1', 'record2').then(l => {
    if (JSON.stringify(l.getEntries()) !== '["record1"]') throw Error('Bad list');
    return true;
  }));
test('snapshotP', t =>
  c.record.snapshotP('record1').then(r => {
    if (JSON.stringify(r) !== '{"name":"Record1","data":{"a":1}}') throw Error('Bad record');
    return true;
  }));
test('setExistingRecordP', t =>
  c.record.setExistingRecordP('record1', { data: { b: 2 } }, true).then(r => {
    if (JSON.stringify(r.get()) !== '{"name":"Record1","data":{"a":1,"b":2}}') {
      throw Error('Bad record');
    }
    return true;
  }));
test('setExistingRecordP', t =>
  c.record.setExistingRecordP('record1', { data: 5 }).then(r => {
    if (JSON.stringify(r.get()) !== '{"name":"Record1","data":5}') {
      throw Error('Bad record');
    }
    return true;
  }));
test('hasP', t =>
  c.record.hasP('record1').then(ok => {
    if (!ok) throw Error('Bad record');
    return true;
  }));
test('makeP', t =>
  c.rpc.makeP('rpc1').then(res => {
    if (res !== 5) throw Error('Bad answer');
    return true;
  }));

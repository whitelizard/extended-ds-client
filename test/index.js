import test from 'blue-tape';
import Deepstream from 'deepstream.io';
import getClient, { addEntry, polyfill } from '../src/index';

const server = new Deepstream();
server.start();
const c = getClient('localhost:6020');

test('polyfill', t => {
  const o = new class X {
    func() {
      this.x = 5;
      return this.x;
    }
  }();
  polyfill(o, 'func', 7); // should be blocked
  polyfill(o, 'x', 7); // should pass
  if (typeof o.func === 'function' && o.x === 7) t.pass();
  else if (o.func === 7) t.fail('polyfill overwrites!');
  else t.fail('polyfill failed');
  t.end();
});

test('loginP', () => c.loginP({}));

test('provide', t => {
  c.rpc.provide('rpc1', (err, res) => res.send(5));
  t.end();
});

test('getRecordP', () =>
  c.record.getRecordP('record1').then(r => {
    if (Object.keys(r.get()).length !== 0) throw Error('Not empty object');
    r.set({ name: 'Record1', data: { a: 1 } });
    return true;
  }));

test('getListP', () =>
  c.record.getListP('list1').then(l => {
    if (l.getEntries().length !== 0) throw Error('Not empty list');
    addEntry(l, 'record1');
    return true;
  }));

test('getExistingRecordP', () =>
  c.record.getExistingRecordP('record1').then(r => {
    if (r.get().name !== 'Record1') throw Error('Bad record');
    return true;
  }));

test('getExistingListP', () =>
  c.record.getExistingListP('list1').then(l => {
    if (l.getEntries()[0] !== 'record1') throw Error('Bad list');
    return true;
  }));

test('addToListP', () =>
  c.record.addToListP('list1', 'record2').then(l => {
    if (l.getEntries()[1] !== 'record2') throw Error('Bad list');
    return true;
  }));

test('removeFromListP', () =>
  c.record.removeFromListP('list1', 'record2').then(l => {
    if (JSON.stringify(l.getEntries()) !== '["record1"]') throw Error('Bad list');
    return true;
  }));

test('snapshotP', () =>
  c.record.snapshotP('record1').then(r => {
    if (JSON.stringify(r) !== '{"name":"Record1","data":{"a":1}}') throw Error('Bad record');
    return true;
  }));

test('setExistingRecordP', () =>
  c.record.setExistingRecordP('record1', { data: { b: 2 } }, true).then(r => {
    if (JSON.stringify(r.get()) !== '{"name":"Record1","data":{"a":1,"b":2}}') {
      throw Error('Bad record');
    }
    return true;
  }));

test('setExistingRecordP', () =>
  c.record.setExistingRecordP('record1', { data: 5 }).then(r => {
    if (JSON.stringify(r.get()) !== '{"name":"Record1","data":5}') {
      throw Error('Bad record');
    }
    return true;
  }));

test('hasP', () =>
  c.record.hasP('record1').then(ok => {
    if (!ok) throw Error('Bad record');
    return true;
  }));

test('makeP', () =>
  c.rpc.makeP('rpc1').then(res => {
    if (res !== 5) throw Error('Bad answer');
    return true;
  }));

import test from 'blue-tape';
import Deepstream from 'deepstream.io';
import getClient, { addEntry, polyfill, CONSTANTS, MERGE_STRATEGIES } from '../src/index';

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

test('CONSTANTS', t => {
  t.ok(CONSTANTS.CONNECTION_STATE);
  t.ok(MERGE_STRATEGIES);
  t.end();
});

test('p.login', () => c.p.login({}));

test('provide', t => {
  c.rpc.provide('rpc1', (err, res) => res.send(5));
  t.end();
});

test('p.getRecord', () =>
  c.record.p.getRecord('record1').then(r => {
    if (Object.keys(r.get()).length !== 0) throw new Error('Not empty object');
    r.set({ name: 'Record1', data: { a: 1 } });
    return true;
  }));
test('getRecordP', () =>
  c.record.getRecordP('record1').then(r => {
    if (Object.keys(r.get()).length !== 2) throw new Error('Bad object');
    return true;
  }));

test('p.getList', () =>
  c.record.p.getList('list1').then(l => {
    if (l.getEntries().length !== 0) throw new Error('Not empty list');
    addEntry(l, 'record1');
    return true;
  }));
test('getListP', () =>
  c.record.getListP('list1').then(l => {
    if (l.getEntries().length !== 1) throw new Error('Bad list');
    return true;
  }));

test('p.getExistingRecord', () =>
  c.record.p.getExistingRecord('record1').then(r => {
    if (r.get().name !== 'Record1') throw new Error('Bad record');
    return true;
  }));
test('getExistingRecordP', () =>
  c.record.getExistingRecordP('record1').then(r => {
    if (r.get().name !== 'Record1') throw new Error('Bad record');
    return true;
  }));

test('p.getExistingList', () =>
  c.record.p.getExistingList('list1').then(l => {
    if (l.getEntries()[0] !== 'record1') throw new Error('Bad list');
    return true;
  }));
test('getExistingListP', () =>
  c.record.getExistingListP('list1').then(l => {
    if (l.getEntries()[0] !== 'record1') throw new Error('Bad list');
    return true;
  }));

test('p.addToList', () =>
  c.record.p.addToList('list1', 'record2').then(l => {
    if (l.getEntries()[1] !== 'record2') throw new Error('Bad list');
    return true;
  }));
test('addToListP', () =>
  c.record.addToListP('list1', 'record3').then(l => {
    if (l.getEntries()[2] !== 'record3') throw new Error('Bad list');
    return true;
  }));

test('p.removeFromList', () =>
  c.record.p.removeFromList('list1', 'record2').then(l => {
    if (JSON.stringify(l.getEntries()) !== '["record1","record3"]') throw new Error('Bad list');
    return true;
  }));
test('removeFromListP', () =>
  c.record.removeFromListP('list1', 'record3').then(l => {
    if (JSON.stringify(l.getEntries()) !== '["record1"]') throw new Error('Bad list');
    return true;
  }));

test('p.snapshot', () =>
  c.record.p.snapshot('record1').then(r => {
    if (JSON.stringify(r) !== '{"name":"Record1","data":{"a":1}}') throw new Error('Bad record');
    return true;
  }));
test('snapshotP', () =>
  c.record.snapshotP('record1').then(r => {
    if (JSON.stringify(r) !== '{"name":"Record1","data":{"a":1}}') throw new Error('Bad record');
    return true;
  }));

test('p.setExistingRecord + deepMerge', () =>
  c.record.p.setExistingRecord('record1', { data: { b: 2 } }, true).then(r => {
    if (JSON.stringify(r.get()) !== '{"name":"Record1","data":{"a":1,"b":2}}') {
      throw new Error('Bad record');
    }
    return true;
  }));
test('setExistingRecordP + default update mode', () =>
  c.record.setExistingRecordP('record1', { data: 5 }).then(r => {
    if (JSON.stringify(r.get()) !== '{"name":"Record1","data":5}') {
      throw new Error('Bad record');
    }
    return true;
  }));
test('p.setExistingRecord + overwrite', () =>
  c.record.p.setExistingRecord('record1', { title: 'The Record' }, false, true).then(r => {
    if (JSON.stringify(r.get()) !== '{"title":"The Record"}') {
      throw new Error('Bad record');
    }
    return true;
  }));

test('p.has', () =>
  c.record.p.has('record1').then(ok => {
    if (!ok) throw new Error('Bad record');
    return true;
  }));
test('hasP', () =>
  c.record.hasP('record1').then(ok => {
    if (!ok) throw new Error('Bad record');
    return true;
  }));

test('p.make', () =>
  c.rpc.p.make('rpc1').then(res => {
    if (res !== 5) throw new Error('Bad answer');
    return true;
  }));
test('makeP', () =>
  c.rpc.makeP('rpc1').then(res => {
    if (res !== 5) throw new Error('Bad answer');
    return true;
  }));

test('p.setListedRecord', () =>
  c.record.p.setListedRecord('records', 'record2', { name: 'Record2' }).then(([id, created]) => {
    if (!created) throw new Error('Was not created!?');
    if (id !== 'record2') throw new Error('Bad ID');
    return c.record.getExistingListP('records').then(l => {
      if (JSON.stringify(l.getEntries()) !== '["records/record2"]') throw new Error('Bad list');
      return c.record.getExistingRecordP('records/record2').then(r => {
        if (r.get().name !== 'Record2') throw new Error('Bad record content');
        return true;
      });
    });
  }));
test('setListedRecordP + auto id & not fullPathList', () =>
  c.record
    .setListedRecordP('records', undefined, { name: 'Record3' }, undefined, undefined, false)
    .then(([id, created]) => {
      if (!created) throw new Error('Was not created!?');
      if (typeof id !== 'string' && id.length !== c.getUid().length) {
        throw new Error('Was not created!?');
      }
      return c.record.getExistingListP('records').then(l => {
        if (JSON.stringify(l.getEntries()) !== `["records/record2","${id}"]`) {
          throw new Error('Bad list');
        }
        return c.record.getExistingRecordP(`records/${id}`).then(r => {
          if (r.get().name !== 'Record3') throw new Error('Bad record content');
          return true;
        });
      });
    }));

test('shutdown', t => {
  c.close();
  server.stop();
  t.end();
});

import test from 'blue-tape';
import Deepstream from 'deepstream.io';
import getClient, { addEntry, polyfill, CONSTANTS, MERGE_STRATEGIES } from '../src/index';

const server = new Deepstream();
server.start();
const c = getClient('localhost:6020');
const cc = getClient('localhost:6020', {
  listedRecordFullPaths: false,
  listedRecordIdKey: 'rid',
  splitChar: '.',
});

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

test('p.login', () => Promise.all([c.p.login({}), cc.loginP({})]));

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
    addEntry(l, 'record1');
    if (l.getEntries().length !== 1) throw new Error('Bad list');
    return true;
  }));

test('p.snapshot', () =>
  c.record.p.snapshot('record1').then(r => {
    console.log(r);
    if (JSON.stringify(r) !== '{"name":"Record1","data":{"a":1}}') throw new Error('Bad record');
    return true;
  }));
test('snapshotP', () =>
  c.record.snapshotP('record1').then(r => {
    if (JSON.stringify(r) !== '{"name":"Record1","data":{"a":1}}') throw new Error('Bad record');
    return true;
  }));
test('p.snapshot fail', t => t.shouldFail(c.record.p.snapshot('record2')));

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

test('p.addToList multi', () =>
  c.record.p.addToList('list1', ['record4', 'r5', 'r6']).then(l => {
    if (l.getEntries()[3] !== 'r6') throw new Error('Bad list');
    return true;
  }));
test('p.removeFromList multi', () =>
  c.record.p.removeFromList('list1', ['record4', 'r5', 'r6']).then(l => {
    if (JSON.stringify(l.getEntries()) !== '["record1"]') throw new Error('Bad list');
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

test('p.getListedRecord', () =>
  c.record.p
    .getListedRecord('records', 'record2', { name: 'Record2', data: [1] })
    .then(([l, r]) => {
      if (r.get().id !== 'record2') throw new Error('Bad ID');
      if (JSON.stringify(l.getEntries()) !== '["records/record2"]') throw new Error('Bad list');
      if (r.get().name !== 'Record2') throw new Error('Bad record content');
      return true;
    }));
let tId;
test('setListedRecordP + auto id', () =>
  cc.record.setListedRecordP('cars', undefined, { name: 'Number 3' }).then(id => {
    if (typeof id !== 'string' && id.length !== c.getUid().length) {
      throw new Error('Was not created!?');
    }
    tId = id;
    return cc.record.getExistingListP('cars').then(l => {
      if (JSON.stringify(l.getEntries()) !== `["${id}"]`) {
        throw new Error('Bad list');
      }
      return cc.record.getExistingRecordP(`cars.${id}`).then(r => {
        if (r.get().name !== 'Number 3') throw new Error('Bad record content');
        return true;
      });
    });
  }));
test('p.getListedRecord deepMergeCustomizer', () =>
  c.record.p
    .getListedRecord(
      'records',
      'record2',
      { data: [2] },
      true,
      undefined,
      (d, s) => Array.isArray(d) && d.concat(s),
    )
    .then(([l, r]) => {
      const rec = r.get();
      console.log('record:', rec);
      if (rec.data.length !== 2) throw new Error('Bad deep merge with concat');
      l.discard();
      return true;
    }));

test('p.deleteListedRecord', () =>
  c.record.p.deleteListedRecord('records', 'record2').then(ok => {
    if (!ok) throw new Error('Not ok');
    c.record.p.getExistingList('records').then(l => {
      // console.log(l.getEntries());
      if (l.getEntries().length !== 0) throw new Error('Bad list');
    });
  }));
test('deleteListedRecordP', () =>
  cc.record.deleteListedRecordP('cars', tId).then(ok => {
    if (!ok) throw new Error('Not ok');
    cc.record.p.getExistingList('cars').then(l => {
      // console.log(l.getEntries());
      if (l.getEntries().length !== 0) throw new Error('Bad list');
    });
  }));

test('p.setData', () =>
  c.record.p.setData('record1', 'name', 'Test').then(() =>
    c.record.p.snapshot('record1').then(r => {
      if (r.name !== 'Test') throw new Error('Bad record');
    }),
  ));

test('p.deleteRecord', () =>
  c.record.p.deleteRecord('record1').then(() =>
    c.record.p.has('record1').then(hasR => {
      if (hasR) throw new Error('Bad record');
    }),
  ));

test('p.deleteList', () =>
  c.record.p.deleteList('list1').then(() =>
    c.record.p.has('list1').then(hasR => {
      if (hasR) throw new Error('Bad record');
    }),
  ));

test('shutdown', t => {
  c.close();
  cc.close();
  server.stop();
  t.end();
});

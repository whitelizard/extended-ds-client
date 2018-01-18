import test from 'blue-tape';
import Deepstream from 'deepstream.io';
import getClient, { addEntry, polyfill, CONSTANTS, MERGE_STRATEGIES } from '../src/index';

const server = new Deepstream();
server.start();
const c = getClient('localhost:6020');
const cc = getClient('localhost:6020', {
  listedRecordFullPaths: false,
  listedRecordIdKey: 'rid',
  datasetRecordFullPaths: false,
  datasetRecordIdKey: 'rid',
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

test('p.login', async t => {
  await Promise.all([c.p.login({}), cc.loginP({})]);
  t.ok(true);
});
test('p.login fail', t => t.shouldFail(c.p.login('record2')));

test('provide', t => {
  c.rpc.provide('rpc1', (err, res) => res.send(5));
  t.end();
});

test('p.make', async t => {
  const res = await c.rpc.p.make('rpc1');
  t.ok(res === 5);
});
test('makeP', async t => {
  const res = await c.rpc.makeP('rpc1');
  t.ok(res === 5);
});
test('p.make fail', t => t.shouldFail(c.rpc.p.make(44)));

test('p.getRecord', async t => {
  const r = await c.record.p.getRecord('record1');
  const rec = r.get();
  t.ok(Object.keys(rec).length === 0);
  r.set({ name: 'Record1', data: { a: 1 } });
});
test('getRecordP', async t => {
  const r = await c.record.getRecordP('record1');
  const rec = r.get();
  t.ok(Object.keys(rec).length === 2);
});

test('p.getList + addEntry', async t => {
  const l = await c.record.p.getList('list1');
  const list = l.getEntries();
  t.ok(list.length === 0);
  addEntry(l, 'record1');
});
test('getListP + addEntry no doubles', async t => {
  const l = await c.record.getListP('list1');
  addEntry(l, 'record1');
  const list = l.getEntries();
  t.ok(list.length === 1);
});

test('p.snapshot', async t => {
  const r = await c.record.p.snapshot('record1');
  console.log(r);
  t.ok(JSON.stringify(r) === '{"name":"Record1","data":{"a":1}}');
});
test('snapshotP', async t => {
  const r = await c.record.snapshotP('record1');
  t.ok(JSON.stringify(r) === '{"name":"Record1","data":{"a":1}}');
});
test('p.snapshot fail', t => t.shouldFail(c.record.p.snapshot('record2')));

test('p.has', async t => {
  const res = await c.record.p.has('record1');
  t.ok(res === undefined);
});
test('hasP', async t => {
  const res = await c.record.hasP('record1');
  t.ok(res === undefined);
});
test('p.has fail', t => t.shouldFail(c.record.p.has(44)));
test('p.has fail', t => t.shouldFail(c.record.p.has('record99')));
test('p.has inverted', async t => {
  const res = await c.record.p.has('record99', true);
  t.ok(res === undefined);
});
test('p.has inverted fail', t => t.shouldFail(c.record.p.has('record1', true)));
// test('p.has fail 2', async t => {
//   const res = await c.record.p.has('record99');
//   t.ok(res === false);
// });

test('p.getExistingRecord', async t => {
  const r = await c.record.p.getExistingRecord('record1');
  t.ok(r.get().name === 'Record1');
});
test('getExistingRecordP', async t => {
  const r = await c.record.getExistingRecordP('record1');
  t.ok(r.get().name === 'Record1');
});
test('p.getExistingRecord fail', t => t.shouldFail(c.record.p.getExistingRecord('record2')));

test('p.getExistingList', async t => {
  const l = await c.record.p.getExistingList('list1');
  t.ok(l.getEntries()[0] === 'record1');
});
test('getExistingListP', async t => {
  const l = await c.record.getExistingListP('list1');
  t.ok(l.getEntries()[0] === 'record1');
});
test('p.getExistingList fail', t => t.shouldFail(c.record.p.getExistingList('list2')));

test('p.addToList', async t => {
  const l = await c.record.p.addToList('list1', 'record2');
  t.ok(l.getEntries()[1] === 'record2');
});
test('addToListP', async t => {
  const l = await c.record.addToListP('list1', 'record3');
  t.ok(l.getEntries()[2] === 'record3');
});
test('p.addToList fail', t => t.shouldFail(c.record.p.addToList('list1', 44)));

test('p.removeFromList', async t => {
  const l = await c.record.p.removeFromList('list1', 'record2');
  t.ok(JSON.stringify(l.getEntries()) === '["record1","record3"]');
});
test('removeFromListP', async t => {
  const l = await c.record.removeFromListP('list1', 'record3');
  t.ok(JSON.stringify(l.getEntries()) === '["record1"]');
});
test('p.removeFromList fail', t => t.shouldFail(c.record.p.removeFromList('list1', 44)));

test('p.addToList multi', async t => {
  const l = await c.record.p.addToList('list1', ['record4', 'r5', 'r6']);
  t.ok(l.getEntries()[3] === 'r6');
});
test('p.removeFromList multi', async t => {
  const l = await c.record.p.removeFromList('list1', ['record4', 'r5', 'r6']);
  t.ok(JSON.stringify(l.getEntries()) === '["record1"]');
});
test('p.addToList fail', t => t.shouldFail(c.record.p.addToList('list1', [44])));

test('p.getDatasetRecord', async t => {
  const [l, r] = await c.record.p.getDatasetRecord('records', 'record2');
  const rec = r.get();
  t.ok(rec.id === 'record2');
  t.ok(JSON.stringify(l.getEntries()) === '["records/record2"]');
});

let carId;
test('getDatasetRecordP + auto id', async t => {
  const [l, r] = await cc.record.getDatasetRecordP('cars');
  const record = r.get();
  carId = record.rid;
  t.ok(typeof carId === 'string' && carId.length > c.getUid().length - 4);
  // const l = await cc.record.getExistingListP('cars');
  t.ok(JSON.stringify(l.getEntries()) === `["${carId}"]`);
});
test('p.deleteDatasetRecord', async t => {
  const l = await c.record.p.deleteDatasetRecord('records', 'record2');
  t.ok(l.getEntries().length === 0);
  t.shouldFail(c.record.p.snapshot('records/record2'));
});
test('deleteDatasetRecordP', async t => {
  const l = await cc.record.deleteDatasetRecordP('cars', carId);
  t.ok(l.getEntries().length === 0);
});
test('p.deleteDatasetRecord non-existant list', async t => {
  const l = await c.record.p.deleteDatasetRecord('a', 'b');
  t.ok(l.getEntries().length === 0);
});

test('p.getDatasetRecord initiate', async t => {
  const [l, r] = await c.record.p.getDatasetRecord('records', 'record2', { name: 'Test' });
  const rec = r.get();
  t.ok(rec.id === 'record2');
  t.ok(rec.name === 'Test');
  t.ok(JSON.stringify(l.getEntries()) === '["records/record2"]');
});

test('p.setData', async t => {
  await c.record.p.setData('record1', 'name', 'Test');
  const r = await c.record.p.snapshot('record1');
  t.ok(r.name === 'Test');
});
test('p.setData fail', t => t.shouldFail(c.record.p.setData(44)));
test('p.setData non-existant', async t => {
  const res = await c.record.p.setData('record99', 'test', 'test');
  t.ok(res === undefined);
  const rec = await c.record.p.snapshot('record99');
  t.ok(rec.test === 'test');
});

// test('subIfNot', async t => {
//   c.event.subIfNot('channel', () => {});
//   t.ok(c.event.emitter.eventNames().includes('channel'));
//   c.event.subIfNot('channel', () => {});
//   c.event.unsubscribe('channel');
//   t.false(c.event.emitter.eventNames().includes('channel'));
// });

test('p.deleteRecord', async t => {
  await c.record.p.deleteRecord('record1');
  t.shouldFail(c.record.p.has('record1'));
});

test('p.deleteList', async t => {
  await c.record.p.deleteList('list1');
  t.shouldFail(c.record.p.has('list1'));
});

test('updateExistingRecord shallow', async t => {
  const r = await c.record.p.getRecord('record1');
  r.set({ name: 'Record1', data: { a: 1 } });
  const response = await c.record.p.updateExistingRecord('record1', {
    name: 'Test',
    a: 1,
    data: { b: 2 },
  });
  t.ok(response === undefined);
  const rec = await c.record.p.snapshot('record1');
  t.ok(rec.data.b === 2 && rec.data.a === undefined);
  t.ok(true);
});

test('updateExistingRecord overwrite', async t => {
  const response = await c.record.p.updateExistingRecord(
    'record1',
    { name: 'Test', data: 3 },
    'overwrite',
  );
  t.ok(response === undefined);
  const rec = await c.record.p.snapshot('record1');
  t.ok(rec.data === 3 && rec.a === undefined);
  t.ok(true);
});

test('updateExistingRecord removeKeys', async t => {
  const response = await c.record.p.updateExistingRecord('record1', ['name'], 'removeKeys');
  t.ok(response === undefined);
  const rec = await c.record.p.snapshot('record1');
  t.ok(rec.data === 3 && rec.name === undefined);
  t.ok(true);
});

test('updateExistingRecord deep', async t => {
  await c.record.p.updateExistingRecord('record1', {
    data: { confs: [{ id: 'a', items: [1, 2] }, { id: 'b', items: [1, 2] }, { id: 'c' }] },
  });
  const response = await c.record.p.updateExistingRecord(
    'record1',
    { data: { confs: [{ items: [3] }] } },
    'deep',
  );
  t.ok(response === undefined);
  const rec = await c.record.p.snapshot('record1');
  t.ok(rec.data.confs[0].items.length === 2);
  t.ok(rec.data.confs[0].items[0] === 3);
  t.ok(true);
});

test('updateExistingRecord deepConcat', async t => {
  const response = await c.record.p.updateExistingRecord(
    'record1',
    { data: { confs: [{ items: [1] }] } },
    'deepConcat',
  );
  t.ok(response === undefined);
  const rec = await c.record.p.snapshot('record1');
  t.ok(rec.data.confs[0].items.length === 3);
  t.ok(rec.data.confs[0].items[2] === 1);
  t.ok(true);
});

test('updateExistingRecord deepConcatAll', async t => {
  const response = await c.record.p.updateExistingRecord(
    'record1',
    { data: { confs: [{ id: 'd' }] } },
    'deepConcatAll',
  );
  t.ok(response === undefined);
  const rec = await c.record.p.snapshot('record1');
  t.ok(rec.data.confs.length === 4);
  t.ok(rec.data.confs[3].id === 'd');
  t.ok(true);
});

test('updateExistingRecord deepIgnore', async t => {
  const response = await c.record.p.updateExistingRecord(
    'record1',
    { data: { confs: ['%IGNORE%', { items: [3] }] } },
    'deepIgnore',
  );
  t.ok(response === undefined);
  const rec = await c.record.p.snapshot('record1');
  t.ok(rec.data.confs[1].items.length === 2);
  t.ok(rec.data.confs[1].items[0] === 3);
  t.ok(true);
});

test('updateExistingRecord deepConcatIgnore', async t => {
  const response = await c.record.p.updateExistingRecord(
    'record1',
    { data: { confs: ['%IGNORE%', { items: [1] }] } },
    'deepConcatIgnore',
  );
  t.ok(response === undefined);
  const rec = await c.record.p.snapshot('record1');
  t.ok(rec.data.confs[1].items.length === 3);
  t.ok(rec.data.confs[1].items[2] === 1);
  t.ok(true);
});

test('updateExistingRecord shallow non-existent', async t => {
  t.shouldFail(c.record.p.updateExistingRecord('record4'));
});

// test('updateExistingRecord shallow non-existent', async t => {
//   t.shouldFail(c.record.p.updateExistingRecord('record4', { name: 'Test', a: 1, data: { b: 2 } }));
// });
//
// test('updateExistingRecord overwrite non-existent', async t => {
//   t.shouldFail(c.record.p.updateExistingRecord('record4', { name: 'Test', data: 3 }, 'overwrite'));
// });
//
// test('updateExistingRecord removeKeys non-existent', async t => {
//   t.shouldFail(c.record.p.updateExistingRecord('record4', ['name'], 'removeKeys'));
// });
//
// test('updateExistingRecord deep non-existent', async t => {
//   t.shouldFail(c.record.p.updateExistingRecord('record4', { data: { confs: [{ items: [3] }] } }, 'deep'));
// });
//
// test('updateExistingRecord deepConcat non-existent', async t => {
//   t.shouldFail(
//     c.record.p.updateExistingRecord('record4', { data: { confs: [{ items: [1] }] } }, 'deepConcat'),
//   );
// });
//
// test('updateExistingRecord deepConcatAll non-existent', async t => {
//   t.shouldFail(
//     c.record.p.updateExistingRecord('record4', { data: { confs: [{ id: 'd' }] } }, 'deepConcatAll'),
//   );
// });
//
// test('updateExistingRecord deepIgnore non-existent', async t => {
//   t.shouldFail(
//     c.record.p.updateExistingRecord(
//       'record4',
//       { data: { confs: ['%IGNORE%', { items: [3] }] } },
//       'deepIgnore',
//     ),
//   );
// });
//
// test('updateExistingRecord deepConcatIgnore non-existent', async t => {
//   t.shouldFail(
//     c.record.p.updateExistingRecord(
//       'record4',
//       { data: { confs: ['%IGNORE%', { items: [1] }] } },
//       'deepConcatIgnore',
//     ),
//   );
// });

test('updateExistingRecord shallow lockedKeys protectedKeys', async t => {
  const r = await c.record.p.getRecord('record1');
  r.set({ name: 'Record1', data: { a: 1 } });
  const response = await c.record.p.updateExistingRecord(
    'record1',
    { name: 'Test', a: 1, data: { b: 2 } },
    'shallow',
    ['name'],
  );
  t.ok(response === undefined);
  const rec = await c.record.p.snapshot('record1');
  t.ok(rec.data.b === 2);
  t.ok(rec.data.a === undefined);
  t.ok(rec.name === 'Record1');
  t.ok(true);
});

test('updateExistingRecord overwrite lockedKeys protectedKeys', async t => {
  const response = await c.record.p.updateExistingRecord(
    'record1',
    { name: 'Test', data: 3 },
    'overwrite',
    ['name'],
    ['a'],
  );
  t.ok(response === undefined);
  const rec = await c.record.p.snapshot('record1');
  t.ok(rec.name === 'Record1');
  t.ok(rec.data === 3);
  t.ok(rec.a === 1);
  t.ok(true);
});

test('updateExistingRecord removeKeys lockedKeys protectedKeys', async t => {
  const response = await c.record.p.updateExistingRecord(
    'record1',
    ['name', 'a', 'data'],
    'removeKeys',
    ['name'],
    ['a'],
  );
  t.ok(response === undefined);
  const rec = await c.record.p.snapshot('record1');
  t.ok(rec.name === 'Record1');
  t.ok(rec.a === 1);
  t.ok(rec.data === undefined);
  t.ok(true);
});

test('updateExistingRecord deep lockedKeys protectedKeys', async t => {
  await c.record.p.updateExistingRecord('record1', {
    data: { confs: [{ id: 'a', items: [1, 2] }, { id: 'b', items: [1, 2] }, { id: 'c' }] },
  });
  const response = await c.record.p.updateExistingRecord(
    'record1',
    { data: { confs: [{ items: [3] }] } },
    'deep',
    ['data'],
  );
  t.ok(response === undefined);
  const rec = await c.record.p.snapshot('record1');
  // t.ok(rec.data.confs[0].items.length === 2);
  t.ok(rec.data.confs[0].items[0] === 1);
  t.ok(true);
});

test('updateExistingRecord deepConcat lockedKeys protectedKeys', async t => {
  const response = await c.record.p.updateExistingRecord(
    'record1',
    { data: { confs: [{ items: [1] }] } },
    'deepConcat',
    ['data'],
  );
  t.ok(response === undefined);
  const rec = await c.record.p.snapshot('record1');
  t.ok(rec.data.confs[0].items.length === 2);
  t.ok(rec.data.confs[0].items[0] === 1);
  t.ok(true);
});

test('updateExistingRecord deepConcatAll lockedKeys protectedKeys', async t => {
  const response = await c.record.p.updateExistingRecord(
    'record1',
    { data: { confs: [{ id: 'd' }] } },
    'deepConcatAll',
    ['data'],
  );
  t.ok(response === undefined);
  const rec = await c.record.p.snapshot('record1');
  t.ok(rec.data.confs.length === 3);
  t.ok(true);
});

test('updateExistingRecord deepIgnore lockedKeys protectedKeys', async t => {
  const response = await c.record.p.updateExistingRecord(
    'record1',
    { data: { confs: ['%IGNORE%', { items: [3] }] } },
    'deepIgnore',
    ['data'],
  );
  t.ok(response === undefined);
  const rec = await c.record.p.snapshot('record1');
  t.ok(rec.data.confs[1].items.length === 2);
  t.ok(rec.data.confs[1].items[0] === 1);
  t.ok(true);
});

test('updateExistingRecord deepConcatIgnore lockedKeys protectedKeys', async t => {
  const response = await c.record.p.updateExistingRecord(
    'record1',
    { data: { confs: ['%IGNORE%', { items: [1] }] } },
    'deepConcatIgnore',
    ['data'],
  );
  t.ok(response === undefined);
  const rec = await c.record.p.snapshot('record1');
  t.ok(rec.data.confs[1].items.length === 2);
  t.ok(rec.data.confs[1].items[2] === undefined);
  t.ok(true);
});

test('shutdown', t => {
  c.close();
  cc.close();
  server.stop();
  t.end();
});

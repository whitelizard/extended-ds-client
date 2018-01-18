# Extended Deepstream client

Promise based deepstream client. It's basically the [`deepstream.io-client-js`](https://www.npmjs.com/package/deepstream.io-client-js) with basic calls promisified, plus some extra methods. All methods are added as polyfills.

### Install

```
npm i -S extended-ds-client
```

## Overview

Creating a client through this package will give you additional methods on the client object, leaving everything from the default client untouched (getRecord, getList etc).

These are the additional functions:

* [`p.login`](#plogin) (alias: `loginP`)
* [`record.p.getRecord`](#recordpgetrecord) (alias: `record.getRecordP`)
* [`record.p.getList`](#recordpgetlist) (alias: `record.getListP`)
* [`record.p.setData`](#recordpsetdata) (alias: `record.setDataP`)
* [`record.p.snapshot`](#recordpsnapshot) (alias: `record.snapshotP`)
* [`record.p.has`](#recordphas) (alias: `record.hasP`)
* [`rpc.p.make`](#rpcpmake) (alias: `rpc.makeP`)
* [`record.p.getExistingRecord`](#recordpgetexistingrecord) (alias: `record.getExistingRecordP`)
* [`record.p.getExistingList`](#recordpgetexistinglist) (alias: `record.getExistingListP`)
* [`record.p.deleteRecord`](#recordpdeleterecord) (alias: `record.deleteRecordP`)
* [`record.p.deleteList`](#recordpdeletelist) (alias: `record.deleteListP`)
* [`record.p.addToList`](#recordpaddtolist) (alias: `record.addToListP`)
* [`record.p.removeFromList`](#recordpremovefromlist) (alias: `record.removeFromListP`)
* [`record.p.updateExistingRecord`](#recordpupdateexistingrecord) (alias: `record.updateExistingRecordP`)
* [`record.p.getDatasetRecord`](#recordpgetdatasetrecord) (alias: `record.getDatasetRecordP`)

In case of _rejection_ on any of these functions, the rejected argument is always an instance of **Error**.

There is also a utility function to import from this module:

* [`addEntry`](#addentry) (prevents duplicates)

Tunneling export of `CONSTANTS` & `MERGE_STRATEGIES` (so that you don't also have to import deepstream.io-client-js for these).

### Example 1

```js
import getClient from 'extended-ds-client';

const client = getClient('localhost:6020');

client.p
  .login({})
  .then(data => {
    console.log('Successful login.', data);
  })
  .catch(data => {
    console.log('Login failed.', data);
  });

const users = {};
client.record.p.getList('users').then(list => {
  // With the list of entries, map each entry to a record promise and
  // wait for all to get finished:
  Promise.all(list.getEntries().map(path => client.record.p.getRecord(path))).then(records =>
    records.forEach(record => {
      // Now save all data etc
      const user = record.get();
      users[user.id] = user;
    }),
  );
});

// Default functions still work
client.record.getList('article/x35b/comments').whenReady(l => {
  // ...
});
```

### Example 2

```js
import getClient, { CONSTANTS, ds } from 'extended-ds-client';

ds.client = getClient('localhost:6020'); // use singleton feature

ds.client.loginP({}); // using alias pattern (instead of p.login)

console.log(CONSTANTS); // MERGE_STRATEGIES is also available as import
```

### Example 3

```js
// Given Example 2 file is imported together with this one

import { ds } from 'extended-ds-client';

// And why not use async-await now...

async function fetchUsers() {
  const l = await ds.client.record.p.getExistingList('users');
  const records = await Promise.all(
    l.getEntries().map(path => ds.client.record.p.getExistingRecord(path)),
  );
  const users = {};
  records.forEach(r => {
    const user = r.get();
    users[user.id] = user;
  });
  return users;
}
```

## getClient

Default export from this module is the function `getClient` to create a client (just like _deepstream()_ in original client). In the same way it also accepts an options object.

```js
const client = getClient('localhost:6020', {
  datasetRecordFullPaths: false,
  datasetRecordIdKey: 'rid',
  splitChar: '.',
});
```

| Option                   | Type      | Default | Description                                                 |
| ------------------------ | --------- | ------- | ----------------------------------------------------------- |
| `datasetRecordFullPaths` | `boolean` | true    | Full paths in lists (or only id) for datasetRecord methods. |
| `datasetRecordIdKey`     | `string`  | `'id'`  | ID key for dataset records.                                 |
| `splitChar`              | `string`  | `'/'`   | Splitting character in paths (for dataset records).         |

## Promisification API

The promises will be resolved with the same argument(s) as the default client callbacks would get (or the `whenReady` when applicable). See [the deepstream JS client documentation](https://deepstreamhub.com/docs/client-js/client/).

### `p.login`

Alias: `loginP`

Straightforward promisification of login. See **Example 1** above.

**Note:** Default login still works, you can still do the standard line with callback:
`client.login({}, success => console.log(success));`

### `record.p.getRecord`

Alias: `record.getRecordP`

Promisification of `record.getRecord`.

```js
client.record.p.getRecord(name)
  .then(dsRecord => ...)
  .catch(error => ...);
```

### `record.p.getList`

Alias: `record.getListP`

Promisification of `record.getList`.

```js
client.record.p.getList(name)
  .then(dsList => ...)
  .catch(error => ...);
```

### `record.p.setData`

Alias: `record.setDataP`

Promisification of `record.setData`.

```js
client.record.p.setData(name, path, data)
  .then(() => ...)
  .catch(error => ...);
```

### `record.p.snapshot`

Alias: `record.snapshotP`

Promisification of `record.snapshot`.

```js
client.record.p.snapshot(name)
  .then(record => ...)
  .catch(error => ...);
```

### `record.p.has`

Alias: `record.hasP`

Promisification of `record.has`, but will reject if it does not exist (and on error of course).

A second optional argument makes the check inverted -- rejecting on existing record. (This can be handy to make sure an id is free).

```js
client.record.p.has(name)
  .then(() => ...)
  .catch(error => ...);

await client.record.p.has('record1');
// if we get here, record1 is a non-taken record id
```

### `rpc.p.make`

Alias: `rpc.makeP`

Promisification of `rpc.make`.

```js
client.rpc.p.make(name, data)
  .then(result => ...)
  .catch(error => ...);
```

## Additional API functions

### `record.p.getExistingRecord`

Alias: `record.getExistingRecordP`

Additional method that does a `.has`-check before `.getRecord` to get a record handler without implicit record creation (Compare with `snapshot` that also fails if the record does not exist, but returns the actual record instead of a record handler). It rejects the promise if the record does not exist.

```js
client.record.p.getExistingRecord(name)
  .then(dsRecord => ...)
  .catch(error => ...);
```

### `record.p.getExistingList`

Alias: `record.getExistingListP`

Like `p.getExistingRecord` above, but for List.

```js
client.record.p.getExistingList(name)
  .then(dsList => ...)
  .catch(error => ...);
```

### `record.p.deleteRecord`

Alias: `record.deleteRecordP`

Will resolve when the _delete_ event is emitted (avoiding the race condition risk).

```js
client.record.p.deleteRecord(arg)
  .then(() => ...)
  .catch(error => ...);
```

| Argument | Type              | Default | Description                                     |
| -------- | ----------------- | ------- | ----------------------------------------------- |
| `arg`    | `string`/`Object` |         | The path to the record _OR_ a DS Record object. |

### `record.p.deleteList`

Alias: `record.deleteListP`

Like `p.deleteRecord` above, but for List.

```js
client.record.p.deleteList(arg)
  .then(() => ...)
  .catch(error => ...);
```

| Argument | Type              | Default | Description                                 |
| -------- | ----------------- | ------- | ------------------------------------------- |
| `arg`    | `string`/`Object` |         | The path to the list _OR_ a DS List object. |

### `record.p.addToList`

Alias: `record.addToListP`

Add an entry or multiple entries to an existing list, **without duplicates**.

```js
client.record.p.addToList('books', 'selfish-gene')
  .then(dsList => ...)
  .catch(error => ...);
```

| Argument   | Type             | Default | Description                  |
| ---------- | ---------------- | ------- | ---------------------------- |
| `listPath` | `string`         |         | The name/path of the record. |
| `id`       | `string`/`Array` |         | Entry(ies) to add.           |

### `record.p.removeFromList`

Alias: `record.removeFromListP`

Remove an entry or multiple entries from an existing list.

```js
client.record.p.removeFromList('books', 'selfish-gene')
  .then(dsList => ...)
  .catch(error => ...);
```

| Argument   | Type             | Default | Description                  |
| ---------- | ---------------- | ------- | ---------------------------- |
| `listPath` | `string`         |         | The name/path of the record. |
| `id`       | `string`/`Array` |         | Entry(ies) to add.           |

### `record.p.updateExistingRecord`

Alias: `record.updateExistingRecordP`

Update a record, choosing from one of multiple update modes:

* `shallow`: Default mode. Overwrite each property at the base level.
* `overwrite`: Replace the whole record.
* `deep`: Deep merge of the `updates` into record (using `lodash.merge`).
* `deepConcat`: Deep merge, but concatenate arrays with only simple values.
* `deepConcatAll`: Merge like `deepConcat`, but concatenate ALL arrays.
* `deepIgnore`: Deep merge, but leave unchanged if some value in `updates` is `'%IGNORE%'`.
* `deepConcatIgnore`: Merge like `deepConcat`, but skip values like `deepIgnore`.
* `removeKeys`: With `updates` as an array, remove corresponding keys in record.

Two additional array arguments, `lockedKeys` and `protectedKeys`, makes it possible to lock or protect given keys, regardless of update mode. Locked keys won't be altered and protected ones won't be removed.

```js
client.record.p.updateExistingRecord('record1', { a: 1, data: { b: 2 }})
  .then(() => ...)
  .catch(error => ...);

client.record.p.updateExistingRecord(
  'records/r-x',
  { data: { configs: [{ items: ['toBeConcatenated'] }] } },
  'deepConcat',
)
  .then(() => ...)
  .catch(error => ...);

client.record.p.updateExistingRecord(
  'record1',
  { data: { confs: ['%IGNORE%', { items: ['replacingFirstItem'] }] }, id: 'xb24' },
  'deepIgnore',
  ['id']
)
  .then(() => ...)
  .catch(error => ...);
```

| Argument        | Type             | Default     | Description                                |
| --------------- | ---------------- | ----------- | ------------------------------------------ |
| `name`          | `string`         |             | The name/path of the record.               |
| `updates`       | `Object`/`Array` |             | The updates. Array for mode = `removeKeys` |
| `mode`          | `string`         | `"shallow"` | Update mode, see details above.            |
| `lockedKeys`    | `Array`          |             | Keys which values can't be altered.        |
| `protectedKeys` | `Array`          |             | Keys which can't be removed.               |

### `record.p.getDatasetRecord`

Alias: `record.getDatasetRecordP`

In case you often end up with the structure of having a list of some type of records as the "parent" of those records. For example a list of all bookings at `bookings` and the bookings at `bookings/room-19`, `bookings/room-27` etc.

On resolve you get back both the deepstream list handle and record handle.

The options described in [`getClient`](#getclient) above will influence how this function operates.

```js
client.record.p.getDatasetRecord('bookings', 'room-27').then(([dsList, dsRecord]) => {
  const booking = dsRecord.get();
  console.log(dsList.getEntries());
  console.log(booking.time, '-', booking.customer);
});
```

| Argument     | Type     | Default | Description                            |
| ------------ | -------- | ------- | -------------------------------------- |
| `listPath`   | `string` |         | The path to the list.                  |
| `recordId`   | `string` |         | The ID of the record.                  |
| `initiation` | `Object` |         | If created, initiate record with this. |

### `record.p.deleteDatasetRecord`

Alias: `record.deleteDatasetRecordP`

Removes both a record and its entry in the list, as created with `getDatasetRecord`.

```js
client.record.p.deleteDatasetRecord('bookings', 'room-27').then(dsList => {
  console.log('List of records after delete:', dsList.getEntries());
});
```

| Argument   | Type     | Default | Description           |
| ---------- | -------- | ------- | --------------------- |
| `listPath` | `string` |         | The path to the list. |
| `recordId` | `string` |         | The ID of the record. |

## Utility functions

These are not extensions of the client object, but freely importable functions.

### `addEntry`

An alternative way to add entries to a deepstream list, that **prevents duplicates**.

See also above method `record.p.addToList` that utilizes this one.

```js
import { addEntry } from 'extended-ds-client';

client.record.p.getExistingList('books')
  .then(dsList => addEntry(dsList, 'selfish-gene'));
  .catch(error => ...);
```

| Argument | Type     | Default | Description       |
| -------- | -------- | ------- | ----------------- |
| `list`   | `Object` |         | A DS List object. |
| `str`    | `string` |         | The entry to add. |

## Licence

MIT

## Change log

### 6.0

* Removed `\*ListedRecord` in favor of new `getDatasetRecord` & `deleteDatasetRecord`
* Name changes of options
  * listedRecordFullPaths -> datasetRecordFullPaths
  * listedRecordIdKey -> datasetRecordIdKey
* Added a very versatile `updateExistingRecord` method
* `record.p.has` now rejects on non-existent record

### 5.0

* Added `getListedRecord` that returns list & record handles
  * Will create both list & record if non-existent
  * Consistent with original `getList`/`getRecord`
* `setListedRecord` now only returns the record id
* Added method `deleteListedRecord`
* `addToList` & `removeFromList` now also accepts multiple entries
* Options added that controls how `*listedRecord` operates
  * datasetRecordFullPaths
  * datasetRecordIdKey
  * splitChar

### 4.0

* New primary naming / method access, using `p` as scope
  * Keeping old naming as aliases
* Full test coverage
* Much smaller footprint in node_modules
* Dropping unofficial tenant extension
* Dropping deprecated methods
* Improved documentation with more examples/code

### 3.0

* Methods added as polyfills
* New method addToList
* Re-exporting of deepstream client constants

#### Please create an Issue in github if you feel something is missing!

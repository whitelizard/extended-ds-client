# Extended Deepstream client

Promise based deepstream client. It's basically the [`deepstream.io-client-js`](https://www.npmjs.com/package/deepstream.io-client-js) with basic calls promisified, plus some extra methods. All methods are added as polyfills.

### Install

```
npm i -S extended-ds-client
```

## Overview

Creating a client through this package will give you additional methods on the client object, leaving everything from the default client untouched (getRecord, getList etc).

These are the additional functions:
- [`p.login`](#plogin) (alias: `loginP`)
- [`record.p.getRecord`](#recordpgetrecord) (alias: `record.getRecordP`)
- [`record.p.getList`](#recordpgetlist) (alias: `record.getListP`)
- [`record.p.snapshot`](#recordpsnapshot) (alias: `record.snapshotP`)
- [`record.p.has`](#recordphas) (alias: `record.hasP`)
- [`rpc.p.make`](#rpcpmake) (alias: `rpc.makeP`)
- [`record.p.getExistingRecord`](#recordpgetexistingrecord) (alias: `record.getExistingRecordP`)
- [`record.p.getExistingList`](#recordpgetexistinglist) (alias: `record.getExistingListP`)
- [`record.p.getListedRecord`](#recordpgetlistedrecord) (alias: `record.getListedRecordP`)
- [`record.p.setListedRecord`](#recordpsetlistedrecord) (alias: `record.setListedRecordP`)
- [`record.p.removeListedRecord`](#recordpremovelistedrecord) (alias: `record.removeListedRecordP`)
- [`record.p.setExistingRecord`](#recordpsetexistingrecord) (alias: `record.setExistingRecordP`)
- [`record.p.addToList`](#recordpaddtolist) (alias: `record.addToListP`)
- [`record.p.removeFromList`](#recordpremovefromlist) (alias: `record.removeFromListP`)

In case of *rejection* on any of these functions, the rejected argument is always an instance of **Error**.

There is also a utility function to import from this module:
- [`addEntry`](#addentry) (prevents duplicates)

Tunneling export of `CONSTANTS` & `MERGE_STRATEGIES` (so that you don't also have to import deepstream.io-client-js for these).

### Example 1

```js
import getClient from 'extended-ds-client';

const client = getClient('localhost:6020');

client.p.login({})
  .then(data => {
    console.log('Successful login.', data);
  })
  .catch(data => {
    console.log('Login failed.', data);
  })

const users = {};
client.record.p.getList('users').then(list => {
  // With the list of entries, map each entry to a record promise and
  // wait for all to get finished:
  Promise.all(
    list.getEntries().map(
      path => client.record.p.getRecord(path)
    )
  )
    .then(records => records.forEach(record => {
      // Now save all data etc
      const user = record.get();
      users[user.id] = user;
    }));
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

Default export from this module is the function `getClient` to create a client (just like *deepstream()* in original client). In the same way it also accepts an options object.

```js
const client = getClient('localhost:6020', {
  listedRecordFullPaths: false,
  listedRecordIdKey: 'rid',
  splitChar: '.'
});
```

| Option | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `listedRecordFullPaths` | `boolean` | true | Full paths in lists (or only id) for listedRecord methods. |
| `listedRecordIdKey` | `string` | `'id'` | ID key for listed records. |
| `splitChar` | `string` | `'/'` | Splitting character in paths (for listed records). |

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

Promisification of `record.has`.

```js
client.record.p.has(name)
  .then(hasRecord => ...)
  .catch(error => ...);
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

### `record.p.getListedRecord`

Alias: `record.getListedRecordP`

In case you often end up with the structure of having a list of some type of records as the "parent" of those records. For example a list of all books at `books` and the books at `books/selfish-gene`, `books/one-child` etc.

Supports different merge strategies. Default is a shallow merge.

On resolve you get back both the deepstream list handle and record handle.

The options described in [`getClient`](#getclient) above will influence how this function operates.

```js
client.record.p.getListedRecord('books', 'selfish-gene', { author: 'R Dawkins', title: 'The Selfish Gene' })
  .then(([dsList, dsRecord]) => {
    const book = dsRecord.get();
    console.log(dsList.getEntries());
    console.log(book.author, '-', book.title);
  });
```

| Argument | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `listPath` | `string` | | The path to the list. |
| `recordId` | `string` | | The ID of the record. |
| `obj` | `Object` | | An object with either an entire record or updates to merge into it. |
| `deepMerge` | `boolean` | `false` | Will turn on deep merge of `obj` into the record. |
| `overwrite` | `boolean` | `false` | Will replace the record with `obj`. |

### `record.p.setListedRecord`

Alias: `record.setListedRecordP`

The same as `record.p.getListedRecord` but without getting handles back, instead you only get the record id.

```js
client.record.p.setListedRecord('books', undefined, { author: 'R Dawkins', title: 'The Selfish Gene' })
  .then(id => {
    console.log('The record got the automatic id:', id);
  });
```

### `record.p.removeListedRecord`

Alias: `record.removeListedRecordP`

Removes both a record and its entry in the list, as created with `getListedRecord`.

```js
client.record.p.removeListedRecord('books', 'selfish-gene').then(ok => {
  console.log('Removal was ok:', ok);
});
```

| Argument | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `listPath` | `string` | | The path to the list. |
| `recordId` | `string` | | The ID of the record. |

### `record.p.setExistingRecord`

Alias: `record.setExistingRecordP`

Update an existing record, with possibility of different merge strategies. Default is a shallow merge.

```js
client.record.p.setExistingRecord('books/selfish-gene', { author: 'Richard Dawkins' })
  .then(dsRecord => ...)
  .catch(error => ...);
```

| Argument | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `name` | `string` | | The name/path of the record. |
| `obj` | `Object` | | An object with either an entire record or updates to merge into it. |
| `deepMerge` | `boolean` | `false` | Will turn on deep merge of `obj` into the record. |
| `overwrite` | `boolean` | `false` | Will replace the record with `obj`. |

### `record.p.addToList`

Alias: `record.addToListP`

Add an entry or multiple entries to an existing list, **without duplicates**.

```js
client.record.p.addToList('books', 'selfish-gene')
  .then(dsList => ...)
  .catch(error => ...);
```

| Argument | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `listPath` | `string` | | The name/path of the record. |
| `id` | `string`/`Array` | | Entry(ies) to add. |

### `record.p.removeFromList`

Alias: `record.removeFromListP`

Remove an entry or multiple entries from an existing list.

```js
client.record.p.removeFromList('books', 'selfish-gene')
  .then(dsList => ...)
  .catch(error => ...);
```

| Argument | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `listPath` | `string` | | The name/path of the record. |
| `id` | `string`/`Array` | | Entry(ies) to add. |

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

| Argument | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `list`| `Object` | | A DS List object. |
| `str`| `string` | | The entry to add. |

## Licence
MIT

## Change log

### 5.0
- Added `getListedRecord` that returns list & record handles
  - Will create both list & record if non-existent
  - Consistent with original `getList`/`getRecord`
- `setListedRecord` now only returns the record id
- Added method `removeListedRecord`
- `addToList` & `removeFromList` now also accepts multiple entries
- Options added that controls how `*listedRecord` operates
  - listedRecordFullPaths
  - listedRecordIdKey
  - splitChar

### 4.0
- New primary naming / method access, using `p` as scope
  - Keeping old naming as aliases
- Full test coverage
- Much smaller footprint in node_modules
- Dropping unofficial tenant extension
- Dropping deprecated methods
- Improved documentation with more examples/code

### 3.0
- Methods added as polyfills
- New method addToList
- Re-exporting of deepstream client constants


#### Please create an Issue in github if you feel something is missing!

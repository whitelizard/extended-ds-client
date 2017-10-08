# Extended Deepstream client

Promise based deepstream client. It's basically just the [`deepstream.io-client-js`](https://www.npmjs.com/package/deepstream.io-client-js) with basic calls promisified, plus some extra methods. All methods are added as polyfills.

## Overview

Creating a client through this package will give you additional methods on the client object, leaving everything from the default client untouched (getRecord, getList etc).

These are the additional functions:
- [`p.login`](#plogin) (alias `loginP`)
- [`record.p.getRecord`](#recordpgetrecord) (alias `record.getRecordP`)
- [`record.p.getList`](#recordpgetlist) (alias `record.getListP`)
- [`record.p.snapshot`](#recordpsnapshot) (alias `record.snapshotP`)
- [`record.p.has`](#recordphas) (alias `record.hasP`)
- [`record.p.getExistingRecord`](#recordpgetexistingrecord) (alias `record.getExistingRecordP`)
- [`record.p.getExistingList`](#recordpgetexistinglist) (alias `record.getExistingListP`)
- [`record.p.setListedRecord`](#recordpsetlistedrecord) (alias `record.setListedRecordP`)
- [`record.p.setExistingRecord`](#recordpsetexistingrecord) (alias `record.setExistingRecordP`)
- [`record.p.addToList`](#recordpaddtolist) (alias `record.addToListP`)
- [`record.p.removeFromList`](#recordpremovefromlist) (alias `record.removeFromListP`)
- [`rpc.p.make`](#rpcpmake) (alias `rpc.makeP`)

In case of *rejection* on any of these functions, the rejected argument is always an instance of **Error**.

There is also a utility function to import from this module:
- [`addEntry`](#addentry) (prevents duplicates)

Tunneling export of `CONSTANTS` & `MERGE_STRATEGIES` (so that you don't also have to import deepstream.io-client-js for these).

Please create an Issue in github if you feel something is missing!

### Install

```
npm i -S extended-ds-client
```

### Example 1

```javascript
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

```javascript
import getClient, { CONSTANTS, ds } from 'extended-ds-client';

ds.client = getClient('localhost:6020'); // use singleton feature

ds.client.loginP({}); // using alias pattern

console.log(CONSTANTS); // MERGE_STRATEGIES is also available as import
```

### Example 3

```javascript
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

## Promisification API

The promises will be resolved with the same argument(s) as the default client callbacks would get (or the `whenReady` when applicable). See [the deepstream JS client documentation](https://deepstreamhub.com/docs/client-js/client/).

### `p.login`

Alias: `loginP`

Straightforward promisification of login. See **Example 1** above.

**Note:** Default login still works, you can still do the standard line with callback:
`client.login({}, success => console.log(success));`

### `record.p.getRecord`

Alias: `record.getRecordP`

Promisification of `record.getRecord`. No callback, instead `.then` and `.catch`.

```javascript
client.record.p.getRecord(name)
  .then(dsRecord => ...)
  .catch(error => ...);
```

### `record.p.getList`

Alias: `record.getListP`

Promisification of `record.getList`. No callback, instead `.then` and `.catch`.

```javascript
client.record.p.getList(name)
  .then(dsList => ...)
  .catch(error => ...);
```

### `record.p.snapshot`

Alias: `record.snapshotP`

Promisification of `record.snapshot`. No callback, instead `.then` and `.catch`.

```javascript
client.record.p.snapshot(name)
  .then(record => ...)
  .catch(error => ...);
```

### `record.p.has`

Alias: `record.hasP`

Promisification of `record.has`. No callback, instead `.then` and `.catch`.

```javascript
client.record.p.has(name)
  .then(hasRecord => ...)
  .catch(error => ...);
```

### `rpc.p.make`

Alias: `rpc.makeP`

Promisification of `rpc.make`. No callback, instead `.then` and `.catch`.

```javascript
client.rpc.p.make(name, data)
  .then(result => ...)
  .catch(error => ...);
```

## Additional API functions

### `record.p.getExistingRecord`

Alias: `record.getExistingRecordP`

Additional method that does a `.has`-check before `.getRecord` to get a record handler without implicit record creation (Compare with `snapshot` that fails if the record does not exist, but returns the actual record instead of a record handler). It rejects the promise if the record does not exist.

```javascript
client.record.p.getExistingRecord(name)
  .then(dsRecord => ...)
  .catch(error => ...);
```

### `record.p.getExistingList`

Alias: `record.getExistingListP`

Like `p.getExistingRecord` above, but for List.

```javascript
client.record.p.getExistingList(name)
  .then(dsList => ...)
  .catch(error => ...);
```

### `record.p.setListedRecord`

Alias: `record.setListedRecordP`

In case you often end up with the structure of having a list of some type of records as the "parent" of those records. For example a list of all books at `books` and the books at `books/one-child`, `books/way-of-the-peaceful-warrior` and `books/hobbit`.

Supports different merge strategies. Default is a shallow merge.

```javascript
client.record.p.setListedRecord('books', 'hobbit', { author: 'J R R Tolkien', title: 'The Hobbit' })
  .then(([id, created]) => {
    console.log(id, created); // => hobbit true (if it did not exist, otherwise false)
    client.record.p.getList('books').then(list => {
      list.getEntries().forEach(path => {
        client.record.p.snapshot(path).then(book => {
          console.log(book.author, '-', book.title); // => J R R Tolkien - The Hobbit
        });
      });
    });
  });
```

| Argument | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `listPath` | `string` | | The path to the list. |
| `recordId` | `string` | | The ID of the record. |
| `obj` | `Object` | | An object with either an entire record or updates to merge into it. |
| `deepMerge` | `boolean` | `false` | Will turn on deep merge of `obj` into the record. |
| `overwrite` | `boolean` | `false` | Will replace the record with `obj`. |
| `fullPathList` | `boolean` | `true` | Will store the full record path in the list, otherwise only the record ID. |


### `record.p.setExistingRecord`

Alias: `record.setExistingRecordP`

Update an existing record, with possibility of different merge strategies. Default is a shallow merge.

```javascript
client.record.p.setExistingRecord('books/hobbit', { author: 'John Ronald Reuel Tolkien' })
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

Add entry to an existing list, **if it is not already there**.

```javascript
client.record.p.addToList('books', 'hobbit')
  .then(dsList => ...)
  .catch(error => ...);
```

| Argument | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `listPath` | `string` | | The name/path of the record. |
| `id` | `string` | | Entry to add. |

### `record.p.removeFromList`

Alias: `record.removeFromListP`

Remove entry from an existing list.

```javascript
client.record.p.removeFromList('books', 'hobbit')
  .then(dsList => ...)
  .catch(error => ...);
```

| Argument | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `listPath` | `string` | | The name/path of the record. |
| `id` | `string` | | Entry to remove. |

## Utility functions

These are not extensions of the client object, but freely importable functions.

### `addEntry`

An alternative way to add entries to a deepstream list, that **prevents duplicates**.

See also above method `record.p.addToList` that utilizes this one.

```javascript
import { addEntry } from 'extended-ds-client';

client.record.p.getExistingList('books')
  .then(dsList => addEntry(dsList, 'hobbit'));
  .catch(error => ...);
```

| Argument | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `list`| `Object` | | A DS List object. |
| `str`| `string` | | The entry to add. |

## Licence
MIT

## Change log

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

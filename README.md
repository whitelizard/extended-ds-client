# Extended Deepstream client

Promise based deepstream client. It's basically just the [`deepstream.io-client-js`](https://www.npmjs.com/package/deepstream.io-client-js) with basic calls promisified, plus some extra methods.

## Overview

Creating a client through this package will give you additional methods on the client object, leaving everything from the default client untouched (getRecord, getList etc).

These are the additional functions:
- [`loginP`](#loginp)
- [`record.getRecordP`](#recordgetrecordp)
- [`record.getListP`](#recordgetlistp)
- [`record.snapshotP`](#recordsnapshotp)
- [`record.hasP`](#recordhasp)
- [`record.getExistingRecordP`](#recordgetexistingrecordp)
- [`record.getExistingListP`](#recordgetexistinglistp)
- [`record.setListedRecordP`](#recordsetlistedrecordp) (previously `listedRecordP`)
- [`record.setExistingRecordP`](#recordsetexistingrecordp)
- [`rpc.makeP`](#rpcmakep)

In case of rejection on any of these functions, the rejected argument is always an instance of Error.

There is also a utility function to import from this module:
- [`addEntry`](#addentry)

### Install

`npm i -S extended-ds-client`

### Example 1

```javascript
import getClient from 'extended-ds-client';

const client = getClient('localhost:6020');

client.loginP({})
  .then(data => {
    console.log('Successful login.', data);
  })
  .catch(data => {
    console.log('Login failed.', data);
  })

const users = {};
client.record.getListP('users').then(list => {
  // With the list of entries, map each entry to a record promise and
  // wait for all to get finished:
  Promise.all(
    list.getEntries().map(
      path => client.record.getRecordP(path)
    )
  )
    .then(records => records.forEach(record => {
      // Now save all data etc
      const user = record.get();
      users[user.id] = user;
    }));
});

// Default functions still work
client.record.getList('article/x35b/comments');
```

## Promisification API

The promises will be resolved with the same argument(s) as the default client callbacks would get (or the `whenReady` when applicable). See [the deepstream JS client documentation](https://deepstreamhub.com/docs/client-js/client/).

### `loginP`

Straightforward promisification of login. See **Example 1** above.

**Note:** Old login still works, you can still do the standard line:

```javascript
const client = getClient('localhost:6020').login({}, success => console.log(success));
```

### `record.getRecordP`

Promisification of `record.getRecord`. No callback, instead `.then` and `.catch`.

```javascript
client.record.getRecordP(name)
  .then(dsRecord => ...)
  .catch(error => ...);
```

### `record.getListP`

Promisification of `record.getList`. No callback, instead `.then` and `.catch`.

```javascript
client.record.getListP(name)
  .then(dsList => ...)
  .catch(error => ...);
```

### `record.snapshotP`

Promisification of `record.snapshot`. No callback, instead `.then` and `.catch`.

```javascript
client.record.snapshotP(name)
  .then(record => ...)
  .catch(error => ...);
```

### `record.hasP`

Promisification of `record.has`. No callback, instead `.then` and `.catch`.

```javascript
client.record.hasP(name)
  .then(hasRecord => ...)
  .catch(error => ...);
```

### `rpc.makeP`

Promisification of `rpc.makeP`. No callback, instead `.then` and `.catch`.

```javascript
client.rpc.makeP(name, data)
  .then(result => ...)
  .catch(error => ...);
```

## Additional API functions

### `record.getExistingRecordP`

Additional method that does a `.has`-check before `.getRecord` to get a record handler without implicit record creation (Compare with `snapshot` that fails if the record does not exist, but returns the actual record instead of a record handler). It rejects the promise if the record does not exist.

```javascript
client.record.getExistingRecordP(name)
  .then(dsRecord => ...)
  .catch(error => ...);
```

### `record.getExistingListP`

Like `getExistingRecordP` above, but for List.

```javascript
client.record.getExistingListP(name)
  .then(dsList => ...)
  .catch(error => ...);
```

### `record.listedRecordP`

**DEPRICATED**. Use `record.setListedRecordP`

### `record.setListedRecordP`

In case you often end up with the structure of having a list of some type of records as the "parent" of those records. For example a list of all books at `books` and the books at `books/one-child`, `books/way-of-the-peaceful-warrior` and `books/bilbo`.

Supports different merge strategies. Default is a shallow merge.

```javascript
client.record.setListedRecordP('books', 'bilbo', { author: 'J R R Tolkien', title: 'Bilbo' })
  .then(([id, created]) => {
    console.log(id, created); // => bilbo true (if it did not exist, otherwise false)
    client.record.getListP('books').then(list => {
      list.getEntries().forEach(path => {
        client.record.snapshotP(path).then(book => {
          console.log(book.author, '-', book.title); // => J R R Tolkien - Bilbo
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


### `record.setExistingRecordP`

Update an existing record, with possibility of different merge strategies. Default is a shallow merge.

```javascript
client.record.setExistingRecordP('books/bilbo', { author: 'John Ronald Reuel Tolkien' })
  .then(dsRecord => ...)
  .catch(error => ...);
```

| Argument | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `name` | `string` | | Is the name/path of the record. |
| `obj` | `Object` | | Is an object with either an entire record or updates to merge into it. |
| `deepMerge` | `boolean` | `false` | Will turn on deep merge of `obj` into the record. |
| `overwrite` | `boolean` | `false` | Will replace the record with `obj`. |

## Utility functions

These are not extensions of the client object, but freely importable functions.

### `addEntry`

An alternative way to add entries to a deepstream list, that **prevents duplicates**.

```javascript
import { addEntry } from 'extended-ds-client';

client.record.getExistingListPT('books')
  .then(dsList => addEntry(dsList, 'bilbo'));
  .catch(error => ...);
```

| Argument | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `list`| `Object` | | A DS List object. |
| `str`| `string` | | The entry to add. |

## Licence
MIT

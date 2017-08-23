# Extended Deepstream client

Promise based deepstream client. It's basically just the *deepstream.io-client-js* with basic calls promisified plus some extra methods.

## Overview

Creating a client through this package will give you additional methods on the client object, leaving everything from the real client untouched (getRecord, getList etc).

These are the basic additional functions:
- `loginP`
- `record.getRecordP`
- `record.getListP`
- `record.snapshotP`
- `record.getExistingRecordP`
- `record.getExistingListP`
- `record.listedRecordP`

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

// Usual functions still work
client.record.getList('article/x35b/comments');
```

## API

### `loginP`

Straightforward promisification of login. See **Example 1** above.

**Note:** Old login still works, and the common chaining of client object creation and login is therefor still possible:

```javascript
const client = getClient('localhost:6020').login({}, success => console.log(success));
```

### `record.getRecordP`

Promisification of `record.getRecord`. No callback, instead `.then` and `.catch`.

```javascript
client.record.getRecordP(name).then(..).catch(..);
```

### `record.getListP`

Promisification of `record.getList`. No callback, instead `.then` and `.catch`.

```javascript
client.record.getListP(name).then(..).catch(..);
```

### `record.snapshotP`

Promisification of `record.snapshot`. No callback, instead `.then` and `.catch`.

```javascript
client.record.snapshotP(name).then(..).catch(..);
```

### `record.hasP`

Promisification of `record.has`. No callback, instead `.then` and `.catch`.

```javascript
client.record.hasP(name).then(..).catch(..);
```

### `record.getExistingRecordP`

Additional method that does a `.has`-check before `.getRecord` to get a record handler without implicit record creation (Compare with `snapshot` that fails if the record does not exist, but returns the actual record instead of a record handler). It rejects the promise if the record does not exist.

```javascript
client.record.getExistingRecordP(name).then(..).catch(..);
```

### `record.getExistingListP`

Like `getExistingRecordP` above, but for List.

```javascript
client.record.getExistingListP(name).then(..).catch(..);
```

## Additional API functions

### `record.listedRecordP`

In case you often end up with the structure of having a list of some type of records as the "parent" of those records. For example a list of all books at `books` and the books at `books/one-child`, `books/way-of-the-peaceful-warrior` and `books/bilbo`.
Supports different merge strategies. Default is a shallow merge.

#### Arguments
- `listPath:string` is the path to the list.
- `recordId:string` is the ID of the record.
- `obj:Object` is an object with either an entire record or updates to merge into it.
- `deepMerge:boolean` (false) will turn on deep merge of `obj` into the record.
- `overwrite:boolean` (false) will replace the record with `obj`.
- `fullPathList:boolean` (true) will store the full record path in the list.

```javascript
client.record.listedRecordP('books', 'bilbo', { author: 'J R R Tolkien', title: 'Bilbo' })
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

### `record.setExistingRecordP`

Update an existing record, with possibility of different merge strategies. Default is a shallow merge.

#### Arguments
- `name:string` is the name/path of the record.
- `obj:Object` is an object with either an entire record or updates to merge into it.
- `deepMerge:boolean` (false) will turn on deep merge of `obj` into the record.
- `overwrite:boolean` (false) will replace the record with `obj`.

```javascript
client.record.setExistingRecordP('books/bilbo', { author: 'John Ronald Reuel Tolkien' }).then(...).catch(...)
```

## Licence
MIT

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
  const userList = list.getEntries();
  // With the list above, map each entry to a record promise and
  // wait for all to get finished:
  Promise.all(
    userList.map(
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

#### loginP

Straightforward promisification of login. See **Example 1** above.

**Note:** Old login still works, and the common chaining of client object creation and login is therefor still possible:

```javascript
const client = getClient('localhost:6020').login({}, success => console.log(success));
```

#### record.getRecordP

Promisification of `record.getRecord`. No callback, instead `.then` and `.catch`.

```javascript
client.record.getRecordP(name).then(..).catch(..);
```

#### record.getListP

Promisification of `record.getList`. No callback, instead `.then` and `.catch`.

```javascript
client.record.getListP(name).then(..).catch(..);
```

#### record.snapshotP

Promisification of `record.snapshot`. No callback, instead `.then` and `.catch`.

```javascript
client.record.snapshotP(name).then(..).catch(..);
```

#### record.record.getExistingRecordP

Additional method that does a `.has`-check before `.getRecord`, to get a record handler without implicit record creation (Compare with `snapshot` that fails if the record does not exist, but returns the actual record instead of a record handler). It rejects the promise if the record does not exist.

```javascript
client.record.snapshotP(name).then(..).catch(..);
```


## MORE TO COME...

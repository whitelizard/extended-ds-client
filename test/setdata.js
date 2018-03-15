// This code snippet reproduces a bug in deepstream.io-client-js
// where subsequent setData calls seem to overwrite eachother's callbacks
const Deepstream = require('deepstream.io');
const deepstream = require('deepstream.io-client-js');

const server = new Deepstream();
server.start();
const client = deepstream('localhost:6020');
client.login();

const rec = client.record.getRecord('setDataRecord');
rec.whenReady(() => {
  rec.set({ a: 0 });
  rec.discard();
  client.record.setData('setDataRecord', 'a', 1, error => console.log('callback 1', error));
  client.record.setData('setDataRecord', 'b', 1, error => console.log('callback 2', error));
  client.record.setData('setDataRecord', 'c', 1, error => console.log('callback 3', error));
});

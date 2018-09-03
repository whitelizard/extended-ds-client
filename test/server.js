import { EventEmitter } from 'events';
import Deepstream from 'deepstream.io';

// Custom PermissionHandler
export default class PermissionHandler extends EventEmitter {
  constructor() {
    super();
    this.isReady = true;
  }

  canPerformAction(id, request, callback) {
    console.log('canPerformAction', request.topic, '/', request.action);
    this.validateAccess().then(result => callback(null, result));
  }

  /* eslint-disable class-methods-use-this */
  validateAccess() {
    return new Promise(r => r(true));
  }
  /* eslint-enable class-methods-use-this */
}

const server = new Deepstream();
server.set('permissionHandler', new PermissionHandler());
server.start();

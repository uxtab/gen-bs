'use strict';

const RequestWrapper = require('./RequestWrapper');
const ClientBase = require('./ClientBase');

class UserEntityClientBase extends ClientBase {
    constructor(urls, collectionUrls) {
        super(urls);
        this.collectionUrls = collectionUrls;
    }

    getAll(sessionId, callback) {
        RequestWrapper.get(this.collectionUrls.getAll(),
            this._makeHeaders({sessionId}), null, null, callback);
    }

    get(sessionId, itemId, callback) {
        RequestWrapper.get(this.collectionUrls.get(itemId),
            this._makeHeaders({sessionId}), null, null, callback);
    }

    add(sessionId, languId, item, callback) {
        RequestWrapper.post(this.collectionUrls.create(),
            this._makeHeaders({sessionId, languId}), item, callback);
    }

    update(sessionId, item, callback) {
        RequestWrapper.put(this.collectionUrls.update(item.id),
            this._makeHeaders({sessionId}), item, callback);
    }

    remove(sessionId, itemId, callback) {
        RequestWrapper.del(this.collectionUrls.remove(itemId),
            this._makeHeaders({sessionId}), null, callback);
    }
}

module.exports = UserEntityClientBase;

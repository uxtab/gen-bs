'use strict';

const async = require('async');

const UserEntityServiceBase = require('./UserEntityServiceBase');

class SampleUploadHistoryService extends UserEntityServiceBase {
    constructor(services, models) {
        super(services, models, models.sampleUploadHistory);
    }

    countActive(user, callback) {
        async.waterfall([
            (callback) => this._checkUserIsSet(user, callback),
            (callback) => this.services.users.ensureUserIsNotDemo(user.id, callback),
            (callback) => this.models.sampleUploadHistory.countActive(user.id, callback)
        ], callback);
    }

    findAll(user, limit, offset, callback) {
        async.waterfall([
            (callback) => this._checkUserIsSet(user, callback),
            (callback) => this.models.sampleUploadHistory.findAll(user.id, limit, offset, callback)
        ], callback);
    }

    findActive(user, callback) {
        if (user && this.services.users.isDemoUserId(user.id)) {
            callback(null, []);
        } else {
            async.waterfall([
                (callback) => this._checkUserIsSet(user, callback),
                (callback) => this.services.users.ensureUserIsNotDemo(user.id, callback),
                (callback) => this.models.sampleUploadHistory.findActive(user.id, callback)
            ], callback);
        }
    }

    findActiveForAllUsers(entryId, callback) {
        this.models.sampleUploadHistory.findActiveForAllUsers(entryId, callback);
    }

    findBySampleId(userId, sampleId, callback) {
        this.models.sampleUploadHistory.findBySampleId(userId, sampleId, callback);
    }
}

module.exports = SampleUploadHistoryService;

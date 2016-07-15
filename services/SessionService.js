'use strict';

const _ = require('lodash');
const async = require('async');
const Uuid = require('node-uuid');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

const ServiceBase = require('./ServiceBase');

const SESSION_TYPES = {
    USER: 'USER',
    DEMO: 'DEMO',
    SYSTEM: 'SYSTEM'
};

class SessionService extends ServiceBase {
    constructor(services, models) {
        super(services, models);

        this.config = this.services.config;
        this.logger = this.services.logger;
    }

    init() {
        const {host, port, password, databaseNumber} = this.config.redis;
        const {sessionTimeoutSec} = this.config.sessions;
        this.redisStore = new RedisStore({
            host,
            port,
            ttl: sessionTimeoutSec,
            pass: password,
            db: databaseNumber
        });

        this.systemSession = {
            id: Uuid.v4(),
            operations:{}
        };
        this.logger.info(`Created system session ${this.systemSession.id}`);
    }

    getSessionStore() {
        return this.redisStore;
    }

    /**
     * Initializes session for a user with the specified email.
     *
     * @param {Object}session Express session
     * @param email User email.
     * @param callback (error, session)
     * */
    startForEmail(session, email, callback) {
        async.waterfall([
            (callback) => this.services.users.findIdByEmail(email, callback),
            (userId, callback) => {
                // TODO: Check and remove existing user session here.
                callback(null, userId);
            },
            (userId, callback) => {
                Object.assign(session, {
                    userId,
                    type: SESSION_TYPES.USER
                });
                callback(null, session);
            }
        ], callback);
    }

    /**
     * Starts demo user session.
     * There should be only few active demo sessions at one time.
     * */
    startDemo(session, callback) {
        async.waterfall([
            (callback) => this.services.users.findDemoUser(callback),
            (demoUser, callback) => {
                Object.assign(session, {
                    userId: demoUser.id,
                    type: SESSION_TYPES.DEMO
                });
                callback(null, session);
            }
        ], callback);
    }

    findById(sessionId, callback) {
        if (sessionId !== this.systemSession.id) {
            this.redisStore.get(sessionId, (error, session) => callback(error, session));
        } else {
            callback(null, this.systemSession);
        }
    }

    findSystemSession(callback) {
        callback(null, this.systemSession);
    }

    destroySession(session, callback) {
        session.destroy(callback);
    }
}

module.exports = SessionService;
'use strict';

const Uuid = require('node-uuid');
const assert = require('assert');


function mustThrowPromise(promise, message) {
    return new Promise((resolve, reject) =>
        promise
            .then((result) => reject(`'${message}' must fail but has result '${result}'`))
            .catch(() => resolve())
    );
}

function generateRegcode() {
    return '' + (10000000 + Math.floor(Math.random() * 89999999));
}

describe('Registration Codes', () => {
    const {registrationCodes, usersClient} = global.regServer;

    function generateEmail() {
        return `a${Uuid.v4()}@example.com`;
    }

    function generateCodeIdAsync() {
        return registrationCodes.createManyRegcodeAsync(1, null, 'en', 'speciality', 'description', 10)
            .then((ids) => ids[0].id)
    }

    describe('Positive tests', () => {
        it('generates and activates new codes', () =>
            registrationCodes.createManyRegcodeAsync(10, null, 'en', 'speciality', 'description', 10)
                .then((regcodeUsers) => {
                    assert.ok(regcodeUsers);
                    assert.equal(regcodeUsers.length, 10);
                    return regcodeUsers;
                })
                .then((regcodeUsers) =>
                    Promise.all(regcodeUsers.map((regcodeUser) => registrationCodes.activateAsync(regcodeUser.id)))
                )
                .catch((error) => assert.fail(`Failed to activate one or more codes: ${error}`))
        );

        it('activates successfully', () => {
            return generateCodeIdAsync()
                .then((id) => registrationCodes.activateAsync(id))
                .catch((error) => {
                    assert.fail(`Activation failed: ${error}`);
                });
        });

        it('must add user with desired regcode and next user with next regcode', () => {
            const regcode = '' + (10000000 + Math.floor(Math.random() * 89999999));
            const nextRegcode = '' + (+regcode + 1);
            return registrationCodes.createRegcodeAsync(regcode, 'en', 'speciality', 'description', 4)
                .then((createdUser) => {
                    assert.equal(createdUser.regcode, regcode);
                })
                .then(() =>
                    registrationCodes.createRegcodeAsync(regcode, 'en', 'speciality', 'description', 4)
                )
                .then((createdUser) => {
                    assert.equal(createdUser.regcode, nextRegcode);
                });
        });

        it('should add regcode and find it', () => {
            const userRegcode = generateRegcode();
            return registrationCodes.createRegcodeAsync(userRegcode, 'en', 'speciality', 'description', 4)
                .then((createdRegcode) => {
                    assert.ok(createdRegcode, 'Not created user');
                    return {regcodeId: createdRegcode.id, regcode: createdRegcode.regcode};
                })
                .then(({regcodeId, regcode}) =>
                    registrationCodes.findRegcodeAsync(regcode)
                        .then((foundRegcode) => {
                            assert.equal(foundRegcode.id, regcodeId);
                            assert.equal(foundRegcode.regcode, regcode);
                        })
                        .then(() => ({regcodeId, regcode}))
                )
                .then(({regcodeId, regcode}) =>
                    registrationCodes.findRegcodeIdAsync(regcodeId)
                        .then((foundRegcode) => {
                            assert.equal(foundRegcode.id, regcodeId);
                            assert.equal(foundRegcode.regcode, regcode);
                        })
                )
        });

        it('should update found user', () => {
            const userRegcode = generateRegcode();
            const userEmail = generateEmail();
            const userLastName = userEmail + '-last-name';
            return registrationCodes.createRegcodeAsync(userRegcode, 'en', 'speciality', 'description', 4)
                .then((regcodeInfo) =>
                    registrationCodes.update(regcodeInfo.id, {email: userEmail, lastName: userLastName})
                )
                .then((userId) =>
                    registrationCodes.findRegcodeAsync(userRegcode)
                )
                .then((regcodeInfo) => {
                    assert(regcodeInfo.lastName === userLastName);
                    assert(regcodeInfo.email === userEmail);
                })
        });
    });

    describe('Negative tests', () => {
        it('activates only once', () => {
            return generateCodeIdAsync()
                .then((id) =>
                    registrationCodes.activateAsync(id)
                        .then(() => mustThrowPromise(
                            registrationCodes.activateAsync(id),
                            'Activated the same code twice for different emails'
                        ))
                );
        });

        it('should work fine with unknown code', () =>
            mustThrowPromise(
                registrationCodes.activateAsync(Uuid.v4()),
                'Activation successful for unknown code.'
            )
        );

        it('should not find absent user', () =>
            Promise.resolve()
                .then(() => mustThrowPromise(
                    registrationCodes.findRegcodeAsync(generateRegcode()),
                    'find for absent regcode'
                ))
                .then(() => mustThrowPromise(
                    registrationCodes.findRegcodeIdAsync(Uuid.v4()),
                    'find for absent regcode id'
                ))
                .then(() => mustThrowPromise(
                    registrationCodes.findRegcodeAsync(null),
                    'find for null regcode'
                ))
                .then(() => mustThrowPromise(
                    registrationCodes.findRegcodeIdAsync(null),
                    'find for null regcode id'
                ))
        );
    });
});
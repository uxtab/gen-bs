'use strict';

const _ = require('lodash');
const async = require('async');

const ChangeCaseUtil = require('../utils/ChangeCaseUtil');
const ModelBase = require('./ModelBase');

const mappedColumns = [
    'id',
    'fieldId',
    'value',
    'synonyms'
];

const TableNames = {
    Keywords: 'keyword',
    Synonyms: 'synonym_text'
};

class KeywordsModel extends ModelBase {
    constructor(models) {
        super(models, 'keyword', mappedColumns);
    }

    add(keyword, callback) {
        this.db.transactionally((trx, callback) => {
            async.waterfall([
                (callback) => this._insertKeywordMetadata(trx, keyword),
                (keywordId, callback) => this._insertSynonyms(trx, keywordId, keyword.synonyms,
                    (error) => callback(error, keywordId))
            ], callback);
        }, callback);
    }

    findForFieldIds(fieldIds, callback) {
        this.db.transactionally((trx, callback) => {
            async.waterfall([
                (callback) => this._findKeywordIdsByFieldIds(trx, fieldIds, callback),
                (fieldIdToKeywordIdsHash, callback) => {
                    const keywordIds = _(fieldIdToKeywordIdsHash)
                    // Get field ids
                        .keys()
                        // Get array of keywordIds for each field id (array of arrays)
                        .map(fieldId => fieldIdToKeywordIdsHash[fieldId])
                        // Concat all arrays into one.
                        .flatten()
                        .value();
                    this._findManyInTransaction(trx, keywordIds, (error, keywords) => callback(error, keywords));
                }
            ], callback);
        }, callback);
    }

    findMany(keywordIds, callback) {
        this.db.transactionally((trx, callback) => {
            this._findManyInTransaction(trx, keywordIds, callback);
        }, callback);
    }

    find(keywordId, callback) {
        const keywordIds = [keywordId];
        this.db.transactionally((trx, callback) => {
            async.waterfall([
                (callback) => this._findManyInTransaction(trx, keywordIds, callback),
                (keywords, callback) => {
                    callback(null, keywords[0]);
                }
            ], callback);
        }, callback);
    }

    /**
     * Calls back with hash {fieldId -> [keywordIds]}
     * */
    _findKeywordIdsByFieldIds(trx, fieldIds, callback) {
        trx.select('id', 'field_id')
            .from(TableNames.Keywords)
            .whereIn('field_id', fieldIds)
            .asCallback((error, results) => {
                async.waterfall([
                    (callback) => callback(error, results),
                    (ids, callback) => this._toCamelCase(ids, callback),
                    (ids, callback) => {
                        const keywordIdsByFieldId = _.reduce(ids, (result, idObject) => {
                            const fieldId = idObject.fieldId;
                            if (!result[fieldId]) {
                                result[fieldId] = [];
                            }
                            result[fieldId].push(idObject.id);
                            return result;
                        }, {});
                        callback(null, keywordIdsByFieldId);
                    }
                ], callback);
            });
    }

    _findManyInTransaction(trx, keywordIds, callback) {
        async.waterfall([
            (callback) => this._findKeywordsMetadata(trx, keywordIds, callback),
            (keywordsMetadata, callback) => this._ensureAllItemsFound(keywordsMetadata, keywordIds, callback),
            (keywordsMetadata, callback) => this._findKeywordsSynonyms(trx, keywordIds,
                (error, synonymsByKeywordId) => callback(error, keywordsMetadata, synonymsByKeywordId)),
            (keywordsMetadata, synonymsByKeywordId, callback) => {
                const keywords = _.map(keywordsMetadata,
                    (keywordMetadata) => this._createKeyword(keywordMetadata, synonymsByKeywordId));
                callback(null, keywords);
            }
        ], callback);
    }

    _createKeyword(keywordMetadata, synonymsByKeywordId) {
        const synonyms = synonymsByKeywordId[keywordMetadata.id];
        return Object.assign({}, keywordMetadata, {
            synonyms
        });
    }

    _findKeywordsMetadata(trx, keywordIds, callback) {
        trx.select()
            .from(TableNames.Keywords)
            .whereIn('id', keywordIds)
            .asCallback((error, keywords) => {
                callback(error, ChangeCaseUtil.convertKeysToCamelCase(keywords));
            });
    }

    /**
     * Calls back with hash {keywordId -> [synonyms]}
     * */
    _findKeywordsSynonyms(trx, keywordIds, callback) {
        trx.select()
            .from(TableNames.Synonyms)
            .whereIn('keyword_id', keywordIds)
            .asCallback((error, results) => {
                const synonyms = ChangeCaseUtil.convertKeysToCamelCase(results);
                const synonymsByKeywordId = _.groupBy(synonyms, 'keywordId');
                callback(error, synonymsByKeywordId);
            });
    }

    _insertKeywordMetadata(trx, keywordMetadata, callback) {
        const dataToInsert = {
            fieldId: keywordMetadata.fieldId,
            value: keywordMetadata.value
        };
        this._unsafeInsert(TableNames.Keywords, dataToInsert, trx, (error, keywordId) => callback(error, keywordId));
    }

    _insertSynonyms(trx, keywordId, synonyms, callback) {
        async.map(synonyms, (synonym, callback) => {
            const dataToInsert = {
                languId: synonym.languId,
                keywordId,
                value: synonym.value
            };
            this._unsafeInsert(TableNames.Synonyms, dataToInsert, trx, callback);
        }, callback);
    }
}

module.exports = KeywordsModel;
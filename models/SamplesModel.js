'use strict';

const _ = require('lodash');
const async = require('async');

const ChangeCaseUtil = require('../utils/ChangeCaseUtil');
const CollectionUtils = require('../utils/CollectionUtils');
const SecureModelBase = require('./SecureModelBase');

const mappedColumns = [
    'id',
    'fileName',
    'hash',
    'type',
    'isAnalyzed',
    'isDeleted',
    'values'
];

const SampleTableNames = {
    Metadata: 'vcf_file_sample',
    Versions: 'vcf_file_sample_version',
    Values: 'vcf_file_sample_value'
};

class SamplesModel extends SecureModelBase {
    constructor(models) {
        super(models, SampleTableNames.Metadata, mappedColumns);
    }

    find(userId, sampleVersionId, callback) {
        this.db.transactionally((trx, callback) => {
            this._findInTransaction(trx, userId, sampleVersionId, callback);
        }, callback);
    }

    findAll(userId, callback) {
        // We need only metadata here, but the actual sample id should be replaced with the latest version id.
        this.db.transactionally((trx, callback) => {
            async.waterfall([
                // Find samples metadata.
                (callback) => this._findSamplesMetadata(trx, userId, null, true, callback),
                (samplesMetadata, callback) => {
                    const sampleIds = _.map(samplesMetadata, sampleMetadata => sampleMetadata.id);
                    this._findLastVersionIdsBySampleIds(trx, sampleIds,
                        (error, versions) => callback(error, samplesMetadata, versions));
                },
                (samplesMetadata, versions, callback) => {
                    this._attachSamplesValues(trx, samplesMetadata, versions,
                        (error, samplesMetadata) => callback(error, samplesMetadata, versions)
                    )
                },
                (samplesMetadata, versions, callback) =>
                    this._replaceSampleIdsWithVersionIds(samplesMetadata, versions, callback)
            ], callback);
        }, callback);
    }

    findMany(userId, sampleVersionIds, callback) {
        this.db.transactionally((trx, callback) => {
            this._findManyInTransaction(trx, userId, sampleVersionIds, callback);
        }, callback);
    }

    /**
     * Adds sample with specified params.
     *
     * @param userId The owner
     * @param languId Language to use for texts.
     * @param sample Sample metadata
     * @param fieldsMetadata Fields metadata. New fields will be added, existing fields will be reused.
     * @param callback (error, sampleVersionId)
     * */
    addSampleWithFields(userId, languId, sample, fieldsMetadata, callback) {
        this.db.transactionally((trx, callback) => {
            async.waterfall([
                // Add all fields that aren't exist yet and get ids and metadata of all the fields for the sample.
                (callback) =>
                    this.models.fields.addMissingFields(languId, fieldsMetadata, trx, (error, fieldsWithIds) => {
                        callback(error, fieldsWithIds);
                    }),
                // Add editable fields to the field list.
                (fieldsWithIds, callback) => {
                    this.models.fields.findEditableFieldsInTransaction(trx, (error, fieldsMetadata) => {
                        const mappedFields = _.map(fieldsMetadata || [], fieldMetadata => {
                            return {
                                id: fieldMetadata.id,
                                fieldMetadata
                            }
                        });
                        const aggregatedFields = fieldsWithIds.concat(mappedFields);
                        callback(error, aggregatedFields);
                    });
                },
                // Create entries for 'vcf_file_sample_values' table to keep field-to-sample connection.
                (fieldsWithIds, callback) => {
                    const sampleWithValues = _.cloneDeep(sample);
                    sampleWithValues.values = _.map(fieldsWithIds, fieldWithId => {
                        return {
                            fieldId: fieldWithId.id,
                            value: null
                        }
                    });

                    // Add sample entries and return version id.
                    this._addInTransaction(userId, sampleWithValues, false, trx, callback);
                }
            ], callback);
        }, callback);
    }

    /**
     * Marks sample as analyzed and reduces available sample count for the user,
     * if sample is not yet marked as analyzed.
     *
     * @param userId Id of the user doing request.
     * @param sampleVersionId Id of the sample version in request.
     * @param callback (error, isSampleMarkedAsAnalyzed)
     * */
    makeSampleIsAnalyzedIfNeeded(userId, sampleVersionId, callback) {
        this.db.transactionally((trx, callback) => {
            async.waterfall([
                (callback) => this._findSampleIdByVersionId(trx, sampleVersionId, callback),
                (sampleId, callback) => this._findSamplesMetadata(trx, userId, [sampleId], true,
                    (error, samplesMetadata) => callback(error, sampleId, samplesMetadata)),
                (sampleId, samplesMetadata, callback) => this._ensureAllItemsFound(samplesMetadata, [sampleId], callback),
                (samplesMetadata, callback) => callback(null, samplesMetadata[0]),
                (sample, callback) => {
                    const isAnalyzed = sample.isAnalyzed || false;
                    if (!isAnalyzed) {
                        async.waterfall([
                            (callback) => {
                                this._setAnalyzed(sample.id, true, trx, callback);
                            },
                            (sampleId, callback) => {
                                this.models.users.reduceForOnePaidSample(userId, trx, callback);
                            },
                            (paidSamplesCount, callback) => {
                                callback(null, true);
                            }
                        ], callback);
                    } else {
                        callback(null, false);
                    }
                }
            ], callback);
        }, callback);
    }

    update(userId, sampleVersionId, sampleToUpdate, callback) {
        this.db.transactionally((trx, callback) => {
            async.waterfall([
                (callback) => this._ensureVersionIsLatest(trx, sampleVersionId, callback),
                (callback) => this._findSampleIdByVersionId(trx, sampleVersionId, callback),
                (sampleId, callback) => {
                    const dataToUpdate = {
                        fileName: sampleToUpdate.fileName
                    };
                    this._unsafeUpdate(sampleId, dataToUpdate, trx,
                        (error, result) => callback(error, (result || {}).id));
                },
                (sampleId, callback) => this._addNewFileSampleVersion(sampleId, trx, callback),
                (versionId, callback) => this._addFileSampleValues(trx, versionId, sampleToUpdate.values,
                    (error) => callback(error, versionId)),
                (versionId, callback) => this._findInTransaction(trx, userId, versionId, callback)
            ], callback);
        }, callback);
    }

    _replaceSampleIdWithLastVersionId(trx, samplesMetadata, callback) {
        async.waterfall([
            // Find last versions for each sample.
            (callback) => {
                const sampleIds = _.map(samplesMetadata, sampleMetadata => sampleMetadata.id);
                this._findLastVersionIdsBySampleIds(trx, sampleIds,
                    (error, versions) => callback(error, samplesMetadata, versions));
            },
            (samplesMetadata, versions, callback) =>
                this._replaceSampleIdsWithVersionIds(samplesMetadata, versions, callback)
        ], callback);
    }

    _setAnalyzed(sampleId, value, trx, callback) {
        trx(this.baseTableName)
            .where('id', sampleId)
            .update({
                is_analyzed: value,
                analyzed_timestamp: value ? this.db.knex.fn.now() : null
            })
            .asCallback((error) => {
                callback(error, sampleId);
            });
    }

    _add(userId, languId, sample, shouldGenerateId, callback) {
        this.db.transactionally((trx, callback) => {
            this._addInTransaction(userId, sample, shouldGenerateId, trx, callback);
        }, callback);
    }

    /**
     * @param {Uuid} userId The owner
     * @param {Object} sample Sample metadata to add.
     * @param {boolean} shouldGenerateId If true, id will be generated.
     * @param {KnexTransaction} trx Knex transaction
     * @param {function(Error, Uuid)} callback (error, sampleVersionId)
     * */
    _addInTransaction(userId, sample, shouldGenerateId, trx, callback) {
        async.waterfall([
            (callback) => {
                const dataToInsert = this._createDataToInsert(userId, sample, shouldGenerateId);
                this._insert(dataToInsert, trx, callback);
            },
            (sampleId, callback) => this._setAnalyzed(sampleId, sample.isAnalyzed || false, trx, callback),
            (sampleId, callback) => this._addNewFileSampleVersion(sampleId, trx, (error, versionId) => {
                callback(error, {
                    sampleId,
                    versionId
                });
            }),
            (sampleObj, callback) => this._addFileSampleValues(trx, sampleObj.versionId, sample.values, (error) => {
                callback(error, sampleObj.versionId);
            })
        ], callback);
    }

    _addNewFileSampleVersion(sampleId, trx, callback) {
        const dataToInsert = {
            id: this._generateId(),
            vcfFileSampleId: sampleId
        };
        this._unsafeInsert(SampleTableNames.Versions, dataToInsert, trx, callback);
    }

    /**
     * Adds sample values into vcf_file_sample_value table.
     *
     * @param {Object} trx Knex transaction object.
     * @param {string} versionId Id of the sample version.
     * @param {Array} values array of the sample values, each of form {fieldId, values (string value for the table column)}.
     * @param {function(Error, Array)} callback (error, resulting values list)
     * */
    _addFileSampleValues(trx, versionId, values, callback) {
        async.map(values, (value, callback) => {
            const dataToInsert = {
                vcfFileSampleVersionId: versionId,
                fieldId: value.fieldId,
                values: value.values
            };
            this._unsafeInsert(SampleTableNames.Values, dataToInsert, trx, callback);
        }, callback);
    }

    /**
     * Ensures the specified version is the latest version of the sample it is related to.
     *
     * @param trx Knex transaction
     * @param sampleVersionId Id of the sample version to check.
     * @param callback (error)
     * */
    _ensureVersionIsLatest(trx, sampleVersionId, callback) {
        // Find last version and compare with the specified.
        async.waterfall([
            (callback) => this._findSampleIdByVersionId(trx, sampleVersionId, callback),
            (sampleId, callback) => this._findLastVersionIdsBySampleIds(trx, [sampleId],
                (error, lastVersions) => callback(error, _.first(lastVersions))),
            (version, callback) => {
                if (version.versionId === sampleVersionId) {
                    callback(null);
                } else {
                    callback(new Error('Action cannot be performed on an old version of the sample.'));
                }
            }
        ], callback);
    }

    _findManyInTransaction(trx, userId, sampleVersionIds, callback) {
        async.waterfall([
            (callback) => this._findSampleVersionsByVersionIds(trx, sampleVersionIds, callback),
            (sampleVersions, callback) =>
                this._findSamplesMetadata(trx,
                    userId,
                    _.map(
                        sampleVersions, sampleVersion => sampleVersion.sampleId
                    ),
                    true, (error, samplesMetadata) => callback(error, samplesMetadata, sampleVersions)),
            (samplesMetadata, sampleVersions, callback) =>
                this._attachSamplesValues(trx, samplesMetadata, sampleVersions,
                    (error, resultSamples) => callback(error, resultSamples, sampleVersions)),
            (samplesMetadata, sampleVersions, callback) =>
                this._replaceSampleIdsWithVersionIds(
                    samplesMetadata, sampleVersions, callback
                )
        ], (error, resultSample) => {
            callback(error, resultSample);
        });
    }

    _attachSamplesValues(trx, samplesMetadata, sampleVersions, callback) {
        const versionIds = _.map(sampleVersions, version => version.versionId);
        async.waterfall([
            (callback) => this._findValuesForVersions(trx, versionIds, callback),
            (values, callback) => {
                const samplesValues = _.groupBy(values, 'vcfFileSampleVersionId');
                const sampleIdToVersionHash = CollectionUtils.createHashByKey(sampleVersions, 'sampleId');
                const resultSamples = _.cloneDeep(samplesMetadata);
                _.forEach(resultSamples, resultSample => {
                    const sampleVersionId = sampleIdToVersionHash[resultSample.id].versionId;
                    resultSample.values = samplesValues[sampleVersionId];
                });
                callback(null, resultSamples);
            }
        ], callback);
    }

    _findValuesForVersions(trx, sampleVersionIds, callback) {
        async.waterfall([
            (callback) => trx.select()
                .from(SampleTableNames.Values)
                .whereIn('vcf_file_sample_version_id', sampleVersionIds)
                .asCallback((error, rows) => callback(error, rows)),
            (rows, callback) => this._toCamelCase(rows, callback)
        ], (error, rows) => {
            callback(error, rows);
        });
    }

    _replaceSampleIdsWithVersionIds(samplesMetadata, sampleVersions, callback) {
        const sampleIdToVersionHash = CollectionUtils.createHashByKey(sampleVersions, 'sampleId');
        const resultSamplesMetadata = _.map(samplesMetadata, sampleMetadata => {
            const sampleVersion = sampleIdToVersionHash[sampleMetadata.id];
            const resultSample = _.cloneDeep(sampleMetadata);
            resultSample.originalId = resultSample.id;
            resultSample.id = sampleVersion.versionId;
            resultSample.timestamp = sampleVersion.timestamp;
            return resultSample;
        });
        callback(null, resultSamplesMetadata);
    }


    _findSampleVersionsByVersionIds(trx, sampleVersionIds, callback) {
        async.waterfall([
            (callback) => trx.select()
                .from(SampleTableNames.Versions)
                .whereIn('id', sampleVersionIds)
                .orderBy('timestamp', 'desc')
                .asCallback((error, results) => callback(error, results)),
            (results, callback) => this._toCamelCase(results, callback)
        ], (error, versions) => {
            const mappedVersions = _.map(versions, (version) =>
                this._mapDatabaseSampleVersionToObject(version));
            callback(error, mappedVersions);
        });
    }

    _findInTransaction(trx, userId, sampleVersionId, callback) {
        async.waterfall([
            (callback) => this._findSampleIdByVersionId(trx, sampleVersionId, callback),
            (sampleId, callback) => this._findSamplesMetadata(trx, userId, [sampleId],
                true, (error, samplesMetadata) => callback(error, samplesMetadata, sampleId)),
            (samplesMetadata, sampleId, callback) => this._ensureAllItemsFound(samplesMetadata, [sampleId], callback),
            (samplesMetadata, callback) => this._replaceSampleIdWithLastVersionId(trx, samplesMetadata, callback),
            (samplesMetadata, callback) => callback(null, samplesMetadata[0]),
            (sampleMetadata, callback) => this._findValuesForVersion(trx, sampleVersionId,
                (error, values) => callback(error, sampleMetadata, values)),
            (sampleMetadata, values, callback) => {
                const resultSample = _.cloneDeep(sampleMetadata);
                resultSample.values = values;
                callback(null, resultSample);
            }
        ], (error, resultSample) => {
            callback(error, resultSample);
        });
    }

    _findSampleIdByVersionId(trx, sampleVersionId, callback) {
        async.waterfall([
            (callback) => trx.select('vcf_file_sample_id')
                .from(SampleTableNames.Versions)
                .where('id', sampleVersionId)
                .orderBy('timestamp', 'desc')
                .limit(1)
                .asCallback((error, results) => callback(error, results)),
            (results, callback) => this._toCamelCase(results, callback)
        ], (error, results) => {
            if (error || !results || !results.length) {
                callback(error || new Error('Sample is not found:' + sampleVersionId));
            } else {
                callback(null, results[0].vcfFileSampleId);
            }
        });
    }

    _findSamplesMetadata(trx, userId, sampleIdsOrNull, shouldExcludeDeletedEntries, callback) {
        let baseQuery = trx.select()
            .from(SampleTableNames.Metadata)
            .where(function () {
                this.where('creator', userId)
                    .orWhere('creator', null)
            });
        if (sampleIdsOrNull) {
            baseQuery = baseQuery.andWhere('id', 'in', sampleIdsOrNull);
        }

        if (shouldExcludeDeletedEntries) {
            baseQuery = baseQuery.andWhereNot('is_deleted', true);
        }

        async.waterfall([
            (callback) => baseQuery.asCallback((error, samplesMetadata) => callback(error, samplesMetadata)),
            (samplesMetadata, callback) => callback(null, ChangeCaseUtil.convertKeysToCamelCase(samplesMetadata)),
            (samplesMetadata, callback) => this._mapItems(samplesMetadata, callback)
        ], (error, samplesMetadata) => {
            callback(error, samplesMetadata);
        });
    }

    _findValuesForVersion(trx, sampleVersionId, callback) {
        async.waterfall([
            (callback) => trx.select('field_id', 'values')
                .from(SampleTableNames.Values)
                .where('vcf_file_sample_version_id', sampleVersionId)
                .asCallback((error, rows) => callback(error, rows)),
            (rows, callback) => this._toCamelCase(rows, callback)
        ], (error, rows) => {
            callback(error, rows);
        });
    }

    /**
     * Finds last version id for each sample id in array.
     *
     * @param trx Knex transaction.
     * @param sampleIds Array of sample ids to search versions for.
     * @param callback (error, versions). Each version is an object
     * which has 'sampleId' and 'versionId' fields.
     * */
    _findLastVersionIdsBySampleIds(trx, sampleIds, callback) {
        const sampleIdsInQuotes = _.map(sampleIds, id => '\'' + id + '\'');
        async.waterfall([
            (callback) => trx.raw(
                    'SELECT DISTINCT ON (vcf_file_sample_id)'
                    + ' vcf_file_sample_id'
                    + ', LAST_VALUE(id) OVER wnd AS id'
                    + ', LAST_VALUE(timestamp) OVER wnd AS last_version_timestamp'
                    + ' FROM vcf_file_sample_version'
                    + ' WHERE vcf_file_sample_id IN'
                    + ' (' + sampleIdsInQuotes.join(', ') + ')'
                    + ' WINDOW wnd AS'
                    + ' (PARTITION BY vcf_file_sample_id ORDER BY timestamp DESC)'
                )
                .asCallback((error, results) => callback(error, results && results.rows)),
            (versions, callback) => this._ensureAllItemsFound(versions, sampleIds, callback),
            (versions, callback) => this._toCamelCase(versions, callback),
            (versions, callback) => {
                const mappedVersions = _.map(versions, (version) => this._mapDatabaseSampleVersionToObject(version));
                callback(null, mappedVersions);
            }
        ], (error, versions) => {
            callback(error, versions);
        });
    }
    
    _mapDatabaseSampleVersionToObject(databaseVersion) {
        return {
            sampleId: databaseVersion.vcfFileSampleId,
            versionId: databaseVersion.id
        }
    }

    _createDataToInsert(userId, sample, shouldGenerateId) {
        return {
            id: shouldGenerateId ? this._generateId() : sample.id,
            creator: userId,
            fileName: sample.fileName,
            hash: sample.hash,
            type: sample.type || 'user'
        };
    }

}

module.exports = SamplesModel;
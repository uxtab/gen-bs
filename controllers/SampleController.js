'use strict';

const multer = require('multer');
const fs = require('fs');
const async = require('async');

const UserEntityControllerBase = require('./base/UserEntityControllerBase');
const _ = require('lodash');
const pako = require('pako');
const StringDecoder = require('string_decoder').StringDecoder;

class SampleController extends UserEntityControllerBase {
    constructor(services) {
        super(services, services.samples);
    }

    add(request, response) {
        this.sendInternalError(response, 'Method is not supported, use upload');
    }

    upload(request, response) {
        const {body, file ,user, session} = request;
        let isCancelled = false;
        request.on('close', function () {
            isCancelled = true;
        });
        async.waterfall([
            (callback) => this.checkUserIsDefined(request, callback),
            (callback) => {
                if (file && file.path && file.size) {
                    callback(null, file);
                } else {
                    callback(new Error('Sample file is not specified.'));
                }
            },
            (sampleFile, callback) => {
                const fileName = (body && body.fileName) ? body.fileName : sampleFile.originalname;
                if (!fileName) {
                    callback(new Error('Sample has no file name.'));
                } else {
                    callback(null, sampleFile, fileName);
                }
            },
            (sampleFile, fileName, callback) => this._parseSampleNames(sampleFile,
                (error, sampleNames) => callback(null, sampleFile, fileName, error, error ? [] : sampleNames)),
            (sampleFile, fileName, parseError, sampleNames, callback) => {
                this.services.samples.createHistoryEntry(user, fileName, parseError, (error, fileId) => {
                    callback(error || parseError, sampleFile, fileName, sampleNames, fileId);
                });
            },
            (sampleFile, fileName, sampleList, operationId, callback) => {
                const fileInfo = {
                    localFilePath: sampleFile.path,
                    fileSize: sampleFile.size,
                    originalFileName: fileName
                };
                this.services.samples.upload(session, user, fileInfo, operationId, (error, operationId) => {
                    // Try removing local file anyway.
                    this._removeSampleFile(fileInfo.localFilePath);
                    callback(error, operationId, sampleList);
                });
            },
            (operationId, sampleList, callback) => {
                this.services.sampleUploadHistory.find(user, operationId, (error, upload) => {
                    callback(error, operationId, upload, sampleList);
                });
            },
            (operationId, upload, sampleList, callback) => {
                this.services.samples.initMetadataForUploadedSample(user, upload.id, upload.fileName, sampleList, null, (error, sampleIds) => {
                    callback(error, operationId, upload, sampleIds);
                });
            },
            (operationId, upload, sampleIds, callback) => {
                this.services.samples.findMany(user, sampleIds, (error, sampleData) => {
                    upload.sampleList = sampleData;
                    callback(error, operationId, upload);
                });
            }],
            (error, operationId, upload) => {
                if (isCancelled) {
                    this.services.sampleUploadHistory.remove(user, operationId, () => {
                        this.sendInternalError(response, new Error('Upload cancelled'));
                    });
                } else {
                    this.sendErrorOrJson(response, error, {operationId, upload});
                }
        });
    }

    _parseSampleNames(sampleFile, callback) {
        fs.readFile(sampleFile.path, (error, content) => {
            if (error) {
                callback(error);
            } else {
                try {
                    const uint8data = pako.inflate(content);
                    const decoder = new StringDecoder('utf8');
                    const text = decoder.write(Buffer.from(uint8data));
                    const {error, sampleNames} = SampleController._findSamples(text);
                    callback(error, sampleNames);
                } catch (error) {
                    callback(error);
                }
            }
        });
    }

    _removeSampleFile(localFilePath) {
        fs.unlink(localFilePath, (error) => {
            if (error) {
                this.services.logger.error('Error removing uploaded sample file: ' + error);
            }
        });
    }

    static _findSamples(text) {
        const found = text.match(/^#[^#].*/gm);
        if (found && found.length) {
            const columns_line = found[0].substr(1);
            const array = columns_line && columns_line.split(/\t/);
            const VCF_COLUMNS = ['CHROM', 'POS', 'ID', 'REF', 'ALT', 'QUAL', 'FILTER', 'INFO', 'FORMAT'];
            if (!_.every(VCF_COLUMNS, mandatoryColumn => _.includes(array, mandatoryColumn))) {
                return {
                    error: 'Unknown columns header format',
                    samples: []
                };
            } else {
                return {
                    error: null,
                    samples: _.difference(array, VCF_COLUMNS)
                };
            }
        } else {
            return {
                error: 'Corrupted VCF header',
                samples: []
            };
        }
    }

    createRouter() {
        const router = super.createRouter();

        const Upload = multer({
            dest: this.services.config.samplesUpload.path,
            limits: {
                fileSize: this.services.config.samplesUpload.maxSizeInBytes
            }
        });

        // Cannot upload many samples here simultaneously, as the client
        // will be unable to distinguish upload operation ids.
        router.post('/upload', Upload.single('sample'), this.upload.bind(this));
        return router;
    }
}

module.exports = SampleController;
import * as ActionTypes from '../actions/fileUpload';
import {fileUploadStatus} from '../actions/fileUpload';
import _ from 'lodash';

const initialState = {
    filesProcesses: [],
    currentUploadId: null
};

/**
 * @template {FP}
 * @param {Array.<FP>} filesProcesses
 * @param {number} id
 * @return {number}
 */
function findFileProcessIndex(filesProcesses, id) {
    return filesProcesses.findIndex((fp) => fp.id === id);
}

/**
 * @template {FP}
 * @param {Array.<FP>} filesProcesses
 * @param {number} index
 * @param {FP} newFileProcess
 * @returns {Array.<FP>}
 */
function updateFileProcess(filesProcesses, index, newFileProcess) {
    return [
        ...filesProcesses.slice(0, index),
        newFileProcess,
        ...filesProcesses.slice(index + 1, filesProcesses.length)
    ];
}

/**
 * @template {FP}
 * @param {Array.<FP>} filesProcesses
 * @param {number|null} id - null or undefined - return filesProcesses
 * @param {FP} fp
 * @returns {Array.<FP>}
 */
function assignFileProcess(filesProcesses, id, fp) {
    if (id == null) {
        return filesProcesses;
    } else {
        const index = findFileProcessIndex(filesProcesses, id);
        if (index < 0) {
            return filesProcesses;
        } else {
            return updateFileProcess(filesProcesses, index, Object.assign({}, filesProcesses[index], fp));
        }
    }
}

/**
 * Full processing progress:
 * - file added: isArchived: false, isUploaded: false
 * - file starts to compress: isArchived: false, isArchiving: true, isUploaded: false
 * - file compressed: isArchived: true, isArchiving: false, isUploaded: false
 * - file starts to upload: isUploading: true, operationId: !null
 * - file upload operation id got: isUploading: true, operationId: !null
 * - file uploaded: isUploaded: true
 * @param {File} file
 * @param {number} id
 * @returns {{progressValue: number, progressStatus: null, operationId: null, isUploading: boolean, file: *, error: null, isArchived: boolean, isArchiving: boolean, isUploaded: boolean}}
 */
function createFileProcess(file, id) {
    return {
        id: id,
        progressValue: 0,
        progressStatus: null,
        operationId: null,
        isUploading: false,
        file: file,
        sampleId: null,
        created: new Date().getTime(),
        error: null,
        isArchived: false,
        isArchiving: false,
        isUploaded: false
    };
}

function reduceUploadsListReceive(state, action) {
    return {
        ...state,
        filesProcesses: _.map(action.uploads, upload => {
            const {created, error, fileName, id, progress, sampleId, status} = upload;
            const fileProcess = createFileProcess({
                name: fileName
            }, id);
            return {
                ...fileProcess,
                created,
                operationId: id,
                sampleId,
                progressValue: progress,
                progressStatus: status,
                error
            };
        }),
        currentUploadId: null
    };
}

function reduceRequestGZIP(state, action) {
    return {
        ...state,
        filesProcesses: assignFileProcess(state.filesProcesses, action.id, {
            isArchiving: true
        })
    };
}

function reduceReceiveGZip(state, action) {
    return {
        ...state,
        filesProcesses: assignFileProcess(state.filesProcesses, action.id, {
            isArchiving: false
        })
    };
}

function reduceFileUploadError(state, action) {
    return {
        ...state,
        filesProcesses: assignFileProcess(state.filesProcesses, action.id, {
            error: action.error,
            progressStatus: fileUploadStatus.ERROR
        })
    };
}

function reduceAddNoGZippedForUpload(state, action) {
    return {
        ...state,
        filesProcesses: [
            ...state.filesProcesses,
            ...action.files.map((item) => createFileProcess(item.file, item.id))
        ]
    };
}

function reduceAddGZippedFileForUpload(state, action) {
    return {
        ...state,
        filesProcesses: assignFileProcess(state.filesProcesses, action.id, {
            file: action.file,
            isArchived: true
        })
    };
}

function reduceRequestFileUpload(state, action) {
    return {
        ...state,
        filesProcesses: assignFileProcess(state.filesProcesses, action.id, {
            isUploading: true
        })
    };
}

function reduceReceiveFileUpload(state, action) {
    return {
        ...state,
        filesProcesses: assignFileProcess(state.filesProcesses, action.id, {
            isUploading: false,
            isUploaded: true
        })
    };
}

function reduceSaveFileOperation(state, action) {
    const {id: uploadId, upload: {created, error, id, progress, status}} = action;
    const {filesProcesses, currentUploadId} = state;
    const index = findFileProcessIndex(filesProcesses, id);
    return {
        ...state,
        filesProcesses: assignFileProcess(filesProcesses, uploadId, {
            operationId: id,
            created,
            error,
            progressValue: progress,
            progressStatus: status
        }),
        currentUploadId: index < 0 ? currentUploadId : id
    };
}

function reduceFileUploadChangeProgress(state, action) {
    return {
        ...state,
        filesProcesses: assignFileProcess(state.filesProcesses, action.id, {
            progressValue: action.progressValue,
            progressStatus: action.progressStatus
        })
    };
}

function reduceSaveUnknownUploadProgress(state, action) {
    const {progressValue, progressStatus, operationId} = action;
    const {unknownEvents} = state;
    const newUnknownEvents = {
        ...unknownEvents,
        [operationId]: {
            progressValue,
            progressStatus
        }
    };
    return {
        ...state,
        unknownEvents: newUnknownEvents
    };
}

function reduceSaveUnknownUploadError(state, action) {
    const {error, operationId} = action;
    const {unknownEvents} = state;
    const newUnknownEvents = {
        ...unknownEvents,
        [operationId]: {
            error
        }
    };
    return {
        ...state,
        unknownEvents: newUnknownEvents
    };
}

function reduceEraseUnknownUploadEvent(state, action) {
    const {operationId} = action;
    const {unknownEvents} = state;
    return {
        ...state,
        unknownEvents: _.omit(unknownEvents, operationId)
    };
}

function reduceSetCurrentUploadId(state, action) {
    return {
        ...state,
        currentUploadId: action.uploadId
    };
}

/**
 * Reset current upload id if at least one of received samples is for selected uploading.
 */
function reduceInvalidateCurrentUploadId(state, action) {
    const {samples} = action;
    const {filesProcesses, currentUploadId} = state;
    const currentUploadProcess = _.find(filesProcesses, fp => fp.id === currentUploadId);
    if (!currentUploadProcess) {
        return state;
    }
    const newCurrentSample = _.find(samples, sample => sample.vcfFileId === currentUploadProcess.operationId);
    if (newCurrentSample) {
        return {
            ...state,
            currentUploadId: null
        };
    } else {
        return state;
    }
}

function reduceUploadsListRemoveUpload(state, action) {
    const {uploadId} = action;
    const {filesProcesses, currentUploadId} = state;
    return {
        filesProcesses: _.filter(filesProcesses, (fp) => fp.operationId !== uploadId && fp.id !== uploadId),
        currentUploadId: currentUploadId === uploadId ? null : currentUploadId
    };
}

export default function fileUpload(state = initialState, action) {

    switch (action.type) {

        case ActionTypes.REQUEST_GZIP:
            return reduceRequestGZIP(state, action);

        case ActionTypes.RECEIVE_GZIP:
            return reduceReceiveGZip(state, action);

        case ActionTypes.FILE_UPLOAD_ERROR:
            return reduceFileUploadError(state, action);

        case ActionTypes.ADD_NOGZIPPED_FOR_UPLOAD:
            return reduceAddNoGZippedForUpload(state, action);

        case ActionTypes.ADD_GZIPPED_FILE_FOR_UPLOAD:
            return reduceAddGZippedFileForUpload(state, action);

        case ActionTypes.REQUEST_FILE_UPLOAD:
            return reduceRequestFileUpload(state, action);

        case ActionTypes.RECEIVE_FILE_UPLOAD:
            return reduceReceiveFileUpload(state, action);

        case  ActionTypes.SAVE_FILE_OPERATION:
            return reduceSaveFileOperation(state, action);

        case ActionTypes.FILE_UPLOAD_CHANGE_PROGRESS:
            return reduceFileUploadChangeProgress(state, action);

        case ActionTypes.SAVE_UNKNOWN_UPLOAD_PROGRESS:
            return reduceSaveUnknownUploadProgress(state, action);

        case ActionTypes.SAVE_UNKNOWN_UPLOAD_ERROR:
            return reduceSaveUnknownUploadError(state, action);

        case ActionTypes.ERASE_UNKNOWN_UPLOAD_EVENT:
            return reduceEraseUnknownUploadEvent(state, action);

        case ActionTypes.UPLOADS_LIST_RECEIVE:
            return reduceUploadsListReceive(state, action);

        case ActionTypes.SET_CURRENT_UPLOAD_ID:
            return reduceSetCurrentUploadId(state, action);

        case ActionTypes.INVALIDATE_CURRENT_UPLOAD_ID:
            return reduceInvalidateCurrentUploadId(state, action);

        case ActionTypes.UPLOADS_LIST_REMOVE_UPLOAD:
            return reduceUploadsListRemoveUpload(state, action);

        default:
            return state;

    }
}

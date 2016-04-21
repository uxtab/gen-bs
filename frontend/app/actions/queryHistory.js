import HttpStatus from 'http-status';

import apiFacade from '../api/ApiFacade';
import {handleError} from './errorHandler';
import {changeHistoryData} from './userData';
import {analyze, changeFilter, changeView} from './ui';
import {changeFilters} from "./userData";
import {changeViews} from "./userData";
import {changeSamples} from "./samplesList";
import {changeSample} from "./samplesList";
import {fetchFields} from "./fields";
import {prepareAnalyze} from './websocket';

export const RECEIVE_QUERY_HISTORY = 'RECEIVE_QUERY_HISTORY';
export const SHOW_QUERY_HISTORY_MODAL = 'SHOW_QUERY_HISTORY_MODAL';
export const CLOSE_QUERY_HISTORY_MODAL = 'CLOSE_QUERY_HISTORY_MODAL';

const HISTORY_NETWORK_ERROR = 'Cannot update "query history" (network error).';
const HISTORY_SERVER_ERROR = 'Cannot update "query history" (server error).';
const UNKNOWN_HISTORY_ID_ERROR = 'Cannot find history item.';

const queryHistoryClient = apiFacade.queryHistoryClient;

const DEFAULT_OFFSET = 0;
const DEFAULT_LIMIT = 10;

export function receiveQueryHistory(history) {
    return {
        type: RECEIVE_QUERY_HISTORY,
        history
    }
}

export function showQueryHistoryModal() {
    return {
        type: SHOW_QUERY_HISTORY_MODAL
    }
}

export function closeQueryHistoryModal() {
    return {
        type: CLOSE_QUERY_HISTORY_MODAL
    }
}

export function clearQueryHistory() {
    return (dispatch) => {
        dispatch(receiveQueryHistory([]));
    }
}

export function updateQueryHistory(limit = DEFAULT_LIMIT, offset = DEFAULT_OFFSET) {
    return (dispatch, getState) => {
        const {auth: {sessionId}, ui: {language}} = getState();
        queryHistoryClient.getQueryHistory(sessionId, language, limit, offset, (error, response) => {
            if (error) {
                dispatch(handleError(null, HISTORY_NETWORK_ERROR));
            } else if (response.status !== HttpStatus.OK) {
                dispatch(handleError(null, HISTORY_SERVER_ERROR));
            } else {
                dispatch(receiveQueryHistory(response.body.result));
            }
        });
    }
}

export function renewHistoryItem(historyItemId) {
    return (dispatch, getState) => {
        const {history} = getState().queryHistory;
        const historyItem = _.find(history, (historyItem) => {
                return historyItem.id === historyItemId;
            }) || null;
        if (historyItem === null) {
            dispatch(handleError(null, UNKNOWN_HISTORY_ID_ERROR));
        } else {
            // copy history item and update names of sample, view and filter. All items from history
            // should be marked as '(from history)'.
            var clonedHistoryItem = _.cloneDeep(historyItem);
            clonedHistoryItem.sample.name = clonedHistoryItem.sample.name + ' (from history)';
            clonedHistoryItem.filters[0].name = clonedHistoryItem.filters[0].name + ' (from history)';
            clonedHistoryItem.view.name = clonedHistoryItem.view.name + ' (from history)';
            dispatch(attachHistory(clonedHistoryItem));
            dispatch(changeSample(clonedHistoryItem.sample.id));
            dispatch(prepareAnalyze());
            dispatch(fetchFields(clonedHistoryItem.sample.id)).then(
                () => {
                    dispatch(changeFilter(clonedHistoryItem.filters[0].id));
                    dispatch(changeView(clonedHistoryItem.view.id));
                    dispatch(analyze(clonedHistoryItem.sample.id, clonedHistoryItem.view.id, clonedHistoryItem.filters[0].id));
                }
            );
            
        }
    }
}

export function attachHistory(historyItem) {
    return (dispatch, getState)=> {
        const {userData:{attachedHistoryData: {sampleId, filterId, viewId}}} = getState();
        const {collection: samples, historyItemId: newSampleId} = changeHistoryItem(
            getState().samplesList.samples, sampleId, historyItem.sample
        );
        const {collection: filters, historyItemId: newFilterId} = changeHistoryItem(
            getState().userData.filters, filterId, historyItem.filters[0]
        );
        const {collection: views, historyItemId: newViewId} = changeHistoryItem(
            getState().userData.views, viewId, historyItem.view
        );
        dispatch(changeHistoryData(newSampleId, newFilterId, newViewId));
        dispatch(changeFilters(filters));
        dispatch(changeViews(views));
        dispatch(changeSamples(samples));
    }

}


export function detachHistory(detachSample, detachFilter, detachView) {
    return (dispatch, getState) => {
        if (detachSample && !detachFilter && !detachView) {
            return;
        }
        const {userData, samplesList} = getState();
        const attachedHistoryData = userData.attachedHistoryData;
        const {
            collection: samples,
            historyItemId: sampleId
        } = detachHistoryItemIfNeedIt(detachSample, samplesList.samples, attachedHistoryData.sampleId, null);
        const {
            collection: filters,
            historyItemId: filterId
        } = detachHistoryItemIfNeedIt(detachFilter, userData.filters, attachedHistoryData.filterId, null);
        const {
            collection: views,
            historyItemId: viewId
        } = detachHistoryItemIfNeedIt(detachView, userData.views, attachedHistoryData.viewId, null);

        dispatch(changeHistoryData(sampleId, filterId, viewId));
        dispatch(changeFilters(filters));
        dispatch(changeViews(views));
        dispatch(changeSamples(samples));

    }
}

function detachHistoryItemIfNeedIt(needDetach, collection, historyItemId) {
    if (needDetach) {
        return changeHistoryItem(collection, historyItemId, null);
    }
    return {collection, historyItemId};
}

function changeHistoryItem(collection, oldHistoryItemId, newHistoryItem) {
    var newHistoryItemId = newHistoryItem ? newHistoryItem.id : null;
    if (oldHistoryItemId === newHistoryItemId) {
        // nothing to be changed
        return {collection, historyItemId: oldHistoryItemId};
    }

    if (oldHistoryItemId) {
        // remove old item from collection
        collection = _.filter(collection, (item) => {
            return item.id !== oldHistoryItemId;
        });
    }

    if (newHistoryItemId) {
        const hasNewHistoryItem = _.some(collection, (item) => {
            return item.id === newHistoryItemId;
        });
        if (!hasNewHistoryItem) {
            // if collection do not contain such item, we should insert it
            collection = [...collection, newHistoryItem];
        } else {
            // reset history id, because we already have this item in collection (so it is not from history, it is
            // common item)
            newHistoryItemId = null;
        }
    }

    return {collection, historyItemId: newHistoryItemId};
}
import HttpStatus from 'http-status';
import _ from 'lodash';

import apiFacade from '../api/ApiFacade';
import {handleError} from './errorHandler';
import {changeHistoryData} from './userData';
import {analyze} from './ui';
import {
    changeSamples,
    changeSample
} from './samplesList';
import {fetchFields} from './fields';
import {prepareAnalyze} from './websocket';
import {
    filtersListSelectFilter,
    filtersListReceive
} from './filtersList';
import {
    viewsListSelectView,
    viewsListReceive
} from './viewsList';
import {entityType} from '../utils/entityTypes';

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
    };
}

export function showQueryHistoryModal() {
    return {
        type: SHOW_QUERY_HISTORY_MODAL
    };
}

export function closeQueryHistoryModal() {
    return {
        type: CLOSE_QUERY_HISTORY_MODAL
    };
}

export function clearQueryHistory() {
    return (dispatch) => {
        dispatch(receiveQueryHistory([]));
    };
}

export function updateQueryHistory(limit = DEFAULT_LIMIT, offset = DEFAULT_OFFSET) {
    return (dispatch, getState) => {
        const {ui: {language}} = getState();
        queryHistoryClient.getQueryHistory(language, limit, offset, (error, response) => {
            if (error) {
                dispatch(handleError(null, HISTORY_NETWORK_ERROR));
            } else if (response.status !== HttpStatus.OK) {
                dispatch(handleError(null, HISTORY_SERVER_ERROR));
            } else {
                dispatch(receiveQueryHistory(response.body.result));
            }
        });
    };
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
            const clonedHistoryItem = _.cloneDeep(historyItem);
            clonedHistoryItem.sample.type = entityType.HISTORY;
            clonedHistoryItem.filters[0].type = entityType.HISTORY;
            clonedHistoryItem.view.type = entityType.HISTORY;
            dispatch([
                attachHistory(clonedHistoryItem),
                changeSample(clonedHistoryItem.sample.id),
                prepareAnalyze()
            ]);
            dispatch(fetchFields(clonedHistoryItem.sample.id))
                .then(() => {
                    dispatch([
                        filtersListSelectFilter(clonedHistoryItem.filters[0].id),
                        viewsListSelectView(clonedHistoryItem.view.id),
                        analyze(clonedHistoryItem.sample.id, clonedHistoryItem.view.id, clonedHistoryItem.filters[0].id)
                    ]);
                });
        }
    };
}

export function attachHistory(historyItem) {
    return (dispatch, getState)=> {
        const {userData:{attachedHistoryData: {sampleId, filterId, viewId}}} = getState();
        const {collection: samples, historyItemId: newSampleId} = changeHistoryItem(
            getState().samplesList.hashedArray.array, sampleId, historyItem.sample
        );
        const {collection: filters, historyItemId: newFilterId} = changeHistoryItem(
            getState().filtersList.hashedArray.array, filterId, historyItem.filters[0]
        );
        const {collection: views, historyItemId: newViewId} = changeHistoryItem(
            getState().viewsList.hashedArray.array, viewId, historyItem.view
        );
        dispatch([
            changeHistoryData(newSampleId, newFilterId, newViewId),
            filtersListReceive(filters),
            viewsListReceive(views),
            changeSamples(samples)
        ]);
    };

}


export function detachHistory(detachSample, detachFilter, detachView) {
    return (dispatch, getState) => {
        if (!detachSample && !detachFilter && !detachView) {
            return;
        }
        const {userData, samplesList, filtersList, viewsList} = getState();
        const attachedHistoryData = userData.attachedHistoryData;
        const {
            collection: samples,
            historyItemId: sampleId
        } = detachHistoryItemIfNeedIt(detachSample, samplesList.hashedArray.array, attachedHistoryData.sampleId);
        const {
            collection: filters,
            historyItemId: filterId
        } = detachHistoryItemIfNeedIt(detachFilter, filtersList.hashedArray.array, attachedHistoryData.filterId);
        const {
            collection: views,
            historyItemId: viewId
        } = detachHistoryItemIfNeedIt(detachView, viewsList.hashedArray.array, attachedHistoryData.viewId);

        dispatch([
            changeHistoryData(sampleId, filterId, viewId),
            filtersListReceive(filters),
            viewsListReceive(views),
            changeSamples(samples)
        ]);
    };
}

function detachHistoryItemIfNeedIt(needDetach, collection, historyItemId) {
    if (needDetach) {
        return changeHistoryItem(collection, historyItemId, null);
    }
    return {collection, historyItemId};
}

function changeHistoryItem(collection, oldHistoryItemId, newHistoryItem) {
    const newHistoryItemId = newHistoryItem ? newHistoryItem.id : null;
    if (oldHistoryItemId === newHistoryItemId) {
        // nothing to be changed
        return {collection, historyItemId: oldHistoryItemId};
    }

    const collectionWOOldHistoryItem = oldHistoryItemId ?
        _.filter(collection, (item) => {
            return item.id !== oldHistoryItemId;
        }) :
        collection;

    if (newHistoryItemId) {
        const hasNewHistoryItem = _.some(collectionWOOldHistoryItem, {id: newHistoryItemId});
        if (!hasNewHistoryItem) {
            // if collection do not contain such item, we should insert it
            const collectionWithNewItem = [...collectionWOOldHistoryItem, newHistoryItem];
            return {collection: collectionWithNewItem, historyItemId: newHistoryItemId};
        } else {
            // reset history id, because we already have this item in collection (so it is not from history, it is
            // common item)
            return {collection: collectionWOOldHistoryItem, historyItemId: null};
        }
    }
    else {
        return {collection: collectionWOOldHistoryItem, historyItemId: newHistoryItemId};
    }
}
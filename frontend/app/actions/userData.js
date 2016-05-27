import apiFacade from '../api/ApiFacade';
import {handleError} from './errorHandler';
import {receiveFields, receiveTotalFields} from './fields';
import {receiveSavedFilesList} from './savedFiles';
import {receiveQueryHistory} from './queryHistory';
import {analyze, changeView} from './ui';
import {changeSample, receiveSamplesList} from './samplesList';

import HttpStatus from 'http-status';
import _ from 'lodash';
import {filtersListReceive} from './filtersList';
import {filtersListSelectFilter} from './filtersList';

/*
 * action types
 */
export const RECEIVE_USERDATA = 'RECEIVE_USERDATA';
export const REQUEST_USERDATA = 'REQUEST_USERDATA';

export const RECEIVE_VIEWS = 'RECEIVE_VIEWS';
export const REQUEST_VIEWS = 'REQUEST_VIEWS';

export const CHANGE_HISTORY_DATA = 'CHANGE_HISTORY_DATA';
export const CHANGE_VIEWS = 'CHANGE_VIEWS';

export const DELETE_VIEW = 'DELETE_VIEW';

const FETCH_USER_DATA_NETWORK_ERROR = 'Cannot update user data (network error). You can reload page and try again.';
const FETCH_USER_DATA_SERVER_ERROR = 'Cannot update user data (server error). You can reload page and try again.';

const FETCH_VIEWS_NETWORK_ERROR = 'Cannot update views data (network error). You can reload page and try again.';
const FETCH_VIEWS_SERVER_ERROR = 'Cannot update views data (server error). You can reload page and try again.';

const CANNOT_FIND_DEFAULT_ITEMS_ERROR = 'Cannot determine set of default settings (sample, view, filter). ' +
                                        'You can try to set sample, filter, view by hand or try to reload page.';

const dataClient = apiFacade.dataClient;
const viewsClient = apiFacade.viewsClient;

/*
 * action creators
 */

function requestUserdata() {
    return {
        type: REQUEST_USERDATA
    };
}

function receiveUserdata(json) {
    return {
        type: RECEIVE_USERDATA,
        userData: json,
        receivedAt: Date.now()
    };
}

export function fetchUserdata() {

    return (dispatch, getState) => {
        dispatch(requestUserdata());
        const {auth: {sessionId}, ui: {languageId}} = getState();
        dataClient.getUserData(sessionId, languageId, (error, response) => {
            if (error) {
                dispatch(handleError(null, FETCH_USER_DATA_NETWORK_ERROR));
            } else if (response.status !== HttpStatus.OK) {
                dispatch(handleError(null, FETCH_USER_DATA_SERVER_ERROR));
            } else {
                const userData = response.body;
                const {
                    samples,
                    totalFields,
                    savedFiles,
                    queryHistory,
                    lastSampleId,
                    lastSampleFields
                } = userData;

                const sample = _.find(samples, sample => sample.id === lastSampleId) ||
                               _.find(samples, sample => sample.type === 'standard');
                const filter = _.find(userData.filters, filter => filter.type === 'standard');
                const view = _.find(userData.views, view => view.type === 'standard');

                dispatch(receiveUserdata(userData));
                dispatch(filtersListReceive(userData.filters));

                dispatch(receiveSavedFilesList(savedFiles));
                dispatch(receiveTotalFields(totalFields));
                dispatch(receiveFields(lastSampleFields));
                dispatch(receiveSamplesList(samples));
                dispatch(receiveQueryHistory(queryHistory));

                if (!sample || !filter || !view) {
                    dispatch(handleError(null, CANNOT_FIND_DEFAULT_ITEMS_ERROR));
                } else {
                    dispatch(changeSample(sample.id));
                    dispatch(filtersListSelectFilter(filter.id));
                    dispatch(changeView(view.id));
                    dispatch(analyze(sample.id, view.id, filter.id));
                }
            }
        });
    };
}

function requestViews() {
    return {
        type: REQUEST_VIEWS
    };
}

export function receiveViews(json) {
    return {
        type: RECEIVE_VIEWS,
        views: json,
        receivedAt: Date.now()
    };
}

export function fetchViews() {

    return (dispatch, getState) => {
        dispatch(requestViews());

        const sessionId = getState().auth.sessionId;
        viewsClient.getAll(sessionId, (error, response) => {
            if (error) {
                dispatch(handleError(null, FETCH_VIEWS_NETWORK_ERROR));
            } else if (response.status !== HttpStatus.OK) {
                dispatch(handleError(null, FETCH_VIEWS_SERVER_ERROR));
            } else {
                const result = response.body;
                const view = result[0] || null;
                const viewId = getState().viewBuilder.selectedView.id || view.id;

                dispatch(receiveViews(result));
                dispatch(changeView(viewId));
            }
        });
    };
}

export function changeHistoryData(sampleId, filterId, viewId) {
    return {
        type: CHANGE_HISTORY_DATA,
        sampleId,
        filterId,
        viewId
    };
}

export function changeViews(views) {
    return {
        type: CHANGE_VIEWS,
        views
    };
}

export function deleteView(viewId) {
    return {
        type: DELETE_VIEW,
        viewId
    };
}

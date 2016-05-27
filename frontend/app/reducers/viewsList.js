import _ from 'lodash';
import * as ActionTypes from '../actions/viewsList';
import immutableArray from '../utils/immutableArray';


class ImmutableHashedArray {
    static makeFromArray(array) {
        return {
            array: array || [],
            hash: _.keyBy(array, 'id')
        };
    }

    static _findIndexForId(array, id) {
        return _.findIndex(array, {id: id});
    }

    static deleteItemId({array, hash}, id) {
        const itemIndex = this._findIndexForId(array, id);
        if (itemIndex < 0) {
            return null;
        } else {
            return {
                array: immutableArray.remove(array, itemIndex),
                hash: _.omit(hash, id)
            };
        }
    }

    static replaceItemId({array, hash}, id, newItem) {
        const itemIndex = this._findIndexForId(array, id);
        if (itemIndex < 0) {
            return null;
        } else {
            return {
                array: immutableArray.replace(array, itemIndex, newItem),
                hash: {..._.omit(hash, id), [newItem.id]: newItem}
            };
        }
    }

    static appendItem({array, hash}, newItem) {
        return {
            array: immutableArray.append(array, newItem),
            hash: {...hash, [newItem.id]: newItem}
        };
    }

    static getItemForId({array, hash}, id) {
        return hash[id];
    }
}


function reduceViewListDeleteView(state, action) {
    const deletedViewIndex = _.findIndex(state.views, {id: action.viewId});
    if (deletedViewIndex < 0) {
        return state;
    }
    const newHashedArray = ImmutableHashedArray.deleteItemId(state.hashedArray, action.viewId);
    if (!newHashedArray) {
        return state;
    }
    const newSelectedViewId = (state.selectedViewId === action.viewId) ? state.views[0].id : state.selectedViewId;
    return Object.assign({}, state, {
        views: immutableArray.remove(state.views, deletedViewIndex),
        viewIdToViewHash: _.omit(state.viewIdToViewHash, action.viewId),
        selectedViewId: newSelectedViewId,
        hashedArray: newHashedArray
    });
}

function reduceViewListEditView(state, action) {
    const editViewIndex = _.findIndex(state.views, {id: action.viewId});
    if (editViewIndex < 0) {
        return state;
    }
    const newHashedArray = ImmutableHashedArray.replaceItemId(state.hashedArray, action.viewId, action.view);
    if (!newHashedArray) {
        return state;
    }
    const updatedSelectedViewId = (state.selectedViewId === action.viewId) ? action.view.id : state.selectedViewId;
    return Object.assign({}, state, {
        views: immutableArray.replace(state.views, editViewIndex, action.view),
        viewIdToViewHash: {..._.omit(state.viewIdToViewHash, action.viewId), [action.view.id]: action.view},
        hashedArray: newHashedArray,
        selectedViewId: updatedSelectedViewId
    });
}

export default function viewsList(state = {
    views: [],
    viewIdToViewHash: {},
    hashedArray: ImmutableHashedArray.makeFromArray([]),
    selectedViewId: null,
    isServerOperation: false
}, action) {

    switch (action.type) {
        case ActionTypes.VIEWS_LIST_START_SERVER_OPERATION:
            return Object.assign({}, state, {
                isServerOperation: true
            });
        case ActionTypes.VIEWS_LIST_END_SERVER_OPERATION:
            return Object.assign({}, state, {
                isServerOperation: false
            });
        case ActionTypes.VIEWS_LIST_RECEIVE:
            return Object.assign({}, state, {
                views: action.views,
                viewIdToViewHash: _.keyBy(action.views, 'id'),
                hashedArray: ImmutableHashedArray.makeFromArray(action.views)
            });
        case ActionTypes.VIEWS_LIST_SELECT_VIEW:
            return Object.assign({}, state, {
                selectedViewId: action.viewId
            });
        case ActionTypes.VIEWS_LIST_ADD_VIEW:
            return Object.assign({}, state, {
                views: immutableArray.append(state.views, action.view),
                viewIdToViewHash: {...state.viewIdToViewHash, [action.view.id]: action.view},
                hashedArray: ImmutableHashedArray.appendItem(state.hashedArray, action.view)
            });
        case ActionTypes.VIEWS_LIST_DELETE_VIEW:
            return reduceViewListDeleteView(state, action);
        case ActionTypes.VIEWS_LIST_EDIT_VIEW:
            return reduceViewListEditView(state, action);
        default:
            return state;
    }
}

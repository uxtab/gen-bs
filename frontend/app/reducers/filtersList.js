import * as ActionTypes from '../actions/filtersList'

export default function filtersList(state = {
    filters: [],
    selectedFilterId: null,
    isServerOperation: false
}, action) {
    
    switch (action.type) {
        case ActionTypes.FILTERS_LIST_START_SERVER_OPERATION:
            return Object.assign({}, state, {
                isServerOperation: true
            });
        case ActionTypes.FILTERS_LIST_END_SERVER_OPERATION:
            return Object.assign({}, state, {
                isServerOperation: false
            });
        case ActionTypes.FILTERS_LIST_RECEIVE:
            return Object.assign({}, state, {
                filters: action.filters
            });
        case ActionTypes.FILTERS_LIST_SELECT_FILTER:
            return Object.assign({}, state, {
                selectedFilterId: action.filterId
            });
        default:
            return state;
    }
}
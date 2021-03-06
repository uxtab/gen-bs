import _ from 'lodash';

import immutableArray from '../utils/immutableArray';
import * as ActionTypes from '../actions/variantsTable';

const DEFAULT_SEARCH_PARAMS_LIMIT_OFFSET = {
    limit: 100,
    offset: 0
};

const DEFAULT_SEARCH_PARAMS = {
    ...DEFAULT_SEARCH_PARAMS_LIMIT_OFFSET,
    search: [],
    sort: [],
    topSearch: {
        search: ''
    }
};

const initialState = {
    operationId: null,
    searchInResultsParams: DEFAULT_SEARCH_PARAMS,
    scrollPos: 0,
    needUpdate: false,
    isNextDataLoading: false,
    isFilteringOrSorting: false,
    isReceivedAll: false,
    selectedRowIndices: [],
    isFetching: false
};

function reduceClearSearchParams(state) {
    return {
        ...state,
        searchInResultsParams: DEFAULT_SEARCH_PARAMS
    };
}

function reduceChangeVariantsLimit(state) {
    return {
        ...state,
        searchInResultsParams: {
            ...state.searchInResultsParams,
            offset: state.searchInResultsParams.offset + state.searchInResultsParams.limit
        },
        isNextDataLoading: true,
        isFetching: true
    };
}

function reduceChangeVariantsGlobalFilter(state, action) {
    const currentGlobalSearchString = state.searchInResultsParams.topSearch.search;
    if (currentGlobalSearchString === action.globalSearchString) {
        return state;
    }
    return {
        ...state,
        searchInResultsParams: {
            ...state.searchInResultsParams,
            topSearch: {
                search: action.globalSearchString
            },
            ...DEFAULT_SEARCH_PARAMS_LIMIT_OFFSET
        },
        needUpdate: true
    };
}

function reduceSetFieldFilter(state, action) {
    const searchArray = [...state.searchInResultsParams.search];
    const fieldIndex = _.findIndex(searchArray, {fieldId: action.fieldId, sampleId: action.sampleId});

    if (action.filterValue !== '') {
        if (fieldIndex !== -1) {
            const currentFilterValue = searchArray[fieldIndex].value;
            if (currentFilterValue === action.filterValue) {
                // filter value is the same
                return state;
            }
            // update current filter
            searchArray[fieldIndex].value = action.filterValue;
        } else {
            // it is new filter
            searchArray.push({fieldId: action.fieldId, sampleId: action.sampleId, value: action.filterValue});
        }
    } else {
        // filter value is empty, so we should remove filter
        if (fieldIndex > -1) {
            searchArray.splice(fieldIndex, 1);
        }
    }

    return {
        ...state,
        searchInResultsParams: {
            ...state.searchInResultsParams,
            search: searchArray,
            ...DEFAULT_SEARCH_PARAMS_LIMIT_OFFSET
        },
        needUpdate: true
    };
}

function reduceSetVariantsSort(state, action) {
    return {
        ...state,
        searchInResultsParams: {
            ...state.searchInResultsParams,
            sort: action.sortOrder
        }
    };
}

function makeNewSort(sort, action) {
    const fieldIndex = _.findIndex(sort, {fieldId: action.fieldId, sampleId: action.sampleId});
    if (fieldIndex < 0) {
        const newItem = {fieldId: action.fieldId, sampleId: action.sampleId, direction: action.sortDirection};
        const trimmedSort = sort.slice(0, action.sortOrder - 1);
        return [
            ...trimmedSort,
            newItem
        ];
    }
    const field = sort[fieldIndex];
    if (field.direction !== action.sortDirection) {
        return immutableArray.assign(sort, fieldIndex, {direction: action.sortDirection});
    }
    if (sort.length > 1) {
        return immutableArray.remove(sort, fieldIndex);
    }
    return sort;
}

function makeSortOrders(sort) {
    return _.map(sort, (sortItem, index) => ({...sortItem, order: index + 1}));
}

function reduceChangeVariantsSort(state, action) {
    const sort = state.searchInResultsParams.sort;
    const newSort = makeNewSort(sort, action);
    if (newSort === sort) {
        return state;
    }
    const newOrderedSort = makeSortOrders(newSort);
    return {
        ...state,
        searchInResultsParams: {
            ...state.searchInResultsParams,
            sort: newOrderedSort,
            ...DEFAULT_SEARCH_PARAMS_LIMIT_OFFSET
        },
        needUpdate: true
    };
}

function reduceRequestVariants(state) {
    return {
        ...state,
        isFetching: true
    };
}

function reduceReceiveAnalysisOperationId(state, action) {
    return {
        ...state,
        isFetching: false,
        operationId: action.operationId,
        lastUpdated: action.receivedAt
    };
}

function reduceRequestSearchedResults(state, action) {
    return {
        ...state,
        isNextDataLoading: action.isNextDataLoading,
        isFilteringOrSorting: action.isFilteringOrSorting,
        isFetching: true,
        needUpdate: false
    };
}

function reduceReceiveSearchedResults(state, action) {
    return {
        ...state,
        isNextDataLoading: false,
        isFilteringOrSorting: false,
        isFetching: false,
        lastUpdated: action.receivedAt,
        isReceivedAll: action.isReceivedAll
    };
}

function reduceSelectVariantsRow(state, action) {
    const {rowIndex, isSelected} = action;
    const {selectedRowIndices} = state;
    let newSelectedRowIndices;
    if (isSelected) {
        newSelectedRowIndices = selectedRowIndices.concat([rowIndex]);
    } else {
        newSelectedRowIndices = _.filter(selectedRowIndices, item => item !== rowIndex);
    }

    return {
        ...state,
        selectedRowIndices: newSelectedRowIndices
    };
}

function reduceClearVariantsRowSelection(state) {
    return {
        ...state,
        selectedRowIndices: initialState.selectedRowIndices
    };
}

export default function variantsTable(state = initialState, action) {
    switch (action.type) {
        case ActionTypes.CLEAR_SEARCH_PARAMS:
            return reduceClearSearchParams(state);
        case ActionTypes.CHANGE_VARIANTS_LIMIT:
            return reduceChangeVariantsLimit(state);
        case ActionTypes.CHANGE_VARIANTS_GLOBAL_FILTER:
            return reduceChangeVariantsGlobalFilter(state, action);
        case ActionTypes.SET_FIELD_FILTER:
            return reduceSetFieldFilter(state, action);
        case ActionTypes.SET_VARIANTS_SORT:
            return reduceSetVariantsSort(state, action);
        case ActionTypes.CHANGE_VARIANTS_SORT:
            return reduceChangeVariantsSort(state, action);
        case ActionTypes.REQUEST_VARIANTS:
            return reduceRequestVariants(state);
        case ActionTypes.RECEIVE_ANALYSIS_OPERATION_ID:
            return reduceReceiveAnalysisOperationId(state, action);
        case ActionTypes.REQUEST_SEARCHED_RESULTS:
            return reduceRequestSearchedResults(state, action);
        case ActionTypes.RECEIVE_SEARCHED_RESULTS:
            return reduceReceiveSearchedResults(state, action);
        case ActionTypes.SELECT_VARIANTS_ROW:
            return reduceSelectVariantsRow(state, action);
        case ActionTypes.CLEAR_VARIANTS_ROWS_SELECTION:
            return reduceClearVariantsRowSelection(state);
        default:
            return state;
    }
}

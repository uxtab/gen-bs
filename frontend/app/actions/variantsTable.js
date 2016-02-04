import config from '../../config'

/*
 * action types
 */
export const INIT_SEARCH_IN_RESULTS_PARAMS = 'INIT_SEARCH_IN_RESULTS_PARAMS'
export const CHANGE_VARIANTS_FILTER= 'CHANGE_VARIANTS_FILTER'

export const SET_COLUMN_FILTER = 'SET_COLUMN_FILTER'

export const FILTER_VARIANTS = 'FILTER_VARIANTS'

export const SORT_VARIANTS = 'SORT_VARIANTS'

export const SELECT_VARIANTS_ROW = 'SELECT_VARIANTS_ROW'

export const RECEIVE_VARIANTS = 'RECEIVE_VARIANTS'
export const REQUEST_VARIANTS = 'REQUEST_VARIANTS'





/*
 * action creators
 */
export function initSearchInResultsParams(searchInResultsParams) {
  return {
    type: INIT_SEARCH_IN_RESULTS_PARAMS,
    searchInResultsParams
  }
}

export function changeVariantsFilter(variants, fieldId, filterValue) {
  return {
    type: CHANGE_VARIANTS_FILTER,
    variants: variants,
    fieldId: fieldId,
    filterValue: filterValue
  }
}

export function sortVariants(variants, columnKey, sortOrder) {
  return {
    type: SORT_VARIANTS,
    variants: variants,
    columnKey: columnKey,
    sortOrder: sortOrder
  }
}

function requestVariants() {
  return {
    type: REQUEST_VARIANTS
  }
}

function receiveVariants(json) {
  return {
    type: RECEIVE_VARIANTS,
    variants: json,
    receivedAt: Date.now()
  }
}

export function fetchVariants(searchParams) {

  return dispatch => {

    console.log('fetchVariants: ', searchParams)

    dispatch(requestVariants())

    setTimeout(() => {
      $.ajax(config.URLS.SEARCH, {
        'data': JSON.stringify(searchParams),
        'type': 'POST',
        'processData': false,
        'contentType': 'application/json'
      })
      .then(json => {
        console.log('search', json)
      })
    }, 1000)

      // TODO:
      // catch any error in the network call.
  }
}

export function setColumnFilter(columnId, filterValue) {
  return {
    type: SET_COLUMN_FILTER,
    columnId,
    filterValue
  }
}

export function selectTableRow(rowId) {
  return {
    type: SELECT_VARIANTS_ROW,
    rowId
  }
}



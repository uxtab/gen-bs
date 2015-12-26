import json from '../../../json/data-variants.json';

import { fetchVariants, sortVariants, filterVariants } from '../../actions'

import store from '../../containers/App'
import observeStore from '../../utils/observeStore'

const $tableElement = $('#variants_table');
const tableHeaderSortElement = '#variants_table thead tr th .variants-table-header-label';
const tableHeaderFilterElement = '#variants_table thead tr th input';

function firstCharUpperCase(str) {
  return str.charAt(0).toUpperCase()  
    + str.slice(1);
}


function selectVariants(state) {
  return state.variantsTable.variants;
}

function selectSort(state) {
  return state.variantsTable.sortOrder;
}

function selectFilter(state) {
  return state.variantsTable.columnFilters;
}

function fillTableHead(labels) {
  var head = [];
  head.push('<tr>');

  labels.map( (label) => {
    head.push(
        `<th data-label="${label}">
          <span class="variants-table-header-label">
            ${firstCharUpperCase(label)}
            <button class="btn btn-default btnSort"></button>
          </span>
          <div><input type="text" placeholder="Search ${label}"></div>
        </th>`);
  })
  head.push('</tr>');
  return head.join('');
}

function fillRows(tData) {
    var row = [];
    //row.push('<tbody id="variants_table_body">')
    //var row = [fillTableHead(Object.keys(tData[0]))];

    tData.map( (rowData) => {
      row.push('<tr>');
      for(var key in rowData) {
        row.push(`<td>${rowData[key]}</td>`);
      }
      row.push('</tr>');
    });

    //row.push('</tbody>')
    return row.join('');
}

function getInitialState() {
  store.dispatch(fetchVariants());

  observeStore(store, selectFilter, () => {
    const filteredVariants = store.getState().variantsTable.filteredVariants;
    render(fillRows(filteredVariants));
  });

  observeStore(store, selectSort, () => {
    const filteredVariants = store.getState().variantsTable.filteredVariants;
    render(fillRows(filteredVariants));
  });

  observeStore(store, selectVariants, () => {
    const variants = store.getState().variantsTable.filteredVariants;
    const isFetching = store.getState().variantsTable.isFetching;
    if(!isFetching) {
      renderHead(fillTableHead(Object.keys(variants[0])));
      render(fillRows(variants));
    }
  });
}

function render(tableRows) {
  $('#variants_table_body').html(tableRows);
}

function renderHead(tableHead) {
  $('#variants_table_head').html(tableHead);
}


function subscribeToSort() {
  $(document).on('click', tableHeaderSortElement, (e) => {
    const key = $(e.currentTarget).parent().data('label');
    var sortOrder;
    if(store.getState().variantsTable.sortOrder) {
      sortOrder = store.getState().variantsTable.sortOrder[key] || 'asc';
    } else {
      sortOrder = 'asc';
    }
    store.dispatch(
      sortVariants(
        store.getState().variantsTable.filteredVariants,
        key,
        (sortOrder === 'asc') ? ('desc'):('asc')
    ))
  });
}

function subscribeToFilter() {
  $(document).on('change keyup', tableHeaderFilterElement, (e) => {
    const key = $(e.currentTarget).parent().parent().data('label');
    const value = $(e.currentTarget).val();
    console.log('input', key, $(e.currentTarget).val());
    store.dispatch(
      filterVariants(
        store.getState().variantsTable.variants,
        key,
        value
    ))
  });
}



$( () => { 
  getInitialState();
  subscribeToSort();
  subscribeToFilter();
    window.store = store;
});


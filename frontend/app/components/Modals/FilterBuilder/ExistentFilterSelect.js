import React, {Component, PropTypes} from 'react';
import 'react-select/dist/react-select.css';
import _ from 'lodash';

import Select from '../../shared/Select';
import {
    getItemLabelByNameAndType,
    getReadonlyReasonForSessionAndType
} from '../../../utils/stringUtils';
import {
    filterBuilderRestartEdit,
    filterBuilderDeleteFilter
} from '../../../actions/filterBuilder';
import {entityTypeIsEditable} from '../../../utils/entityTypes';
import {isFilterComplexModel} from '../../../utils/filterUtils';
import * as i18n from '../../../utils/i18n';


export default class ExistentFilterSelect extends Component {

    render() {
        const {auth, texts, filterBuilder} = this.props;
        const selectedFilter = filterBuilder.editingFilter.filter;
        const filters = filterBuilder.filtersList.hashedArray.array;
        const isDemoSession = auth.isDemo;
        const isFilterEditable = entityTypeIsEditable(selectedFilter.type);
        const isFilterDuplicable = !isFilterComplexModel(selectedFilter);
        return (
            <div className='form-rows'>
                <div className='form-group'>
                    {this.renderTitle(texts)}
                </div>
                {this.renderWarning(isDemoSession, selectedFilter.type, texts)}
                <div className='form-group row-head-selector'>
                    <div className='col-sm-12 col-md-11 col-lg-9 btn-group-select-group'>
                        {this.renderFiltersSelector(filters)}
                        {this.renderButtonGroup(isDemoSession, isFilterEditable, isFilterDuplicable, texts)}
                    </div>
                </div>                
            </div>
        );
    }

    renderTitle(texts) {
        return (
            <h5>
                {texts.p('existentSelect.title')}
            </h5>
        );
    }

    renderWarning(isDemoSession, selectedFilterType, texts) {
        const warningText = getReadonlyReasonForSessionAndType(isDemoSession, selectedFilterType, (path) => texts.p(`readOnlyReason.${path}`));

        if (!warningText) {
            return null;
        }
        return (
            <div className='alert alert-help'>
                <span>
                    {warningText}
                </span>
            </div>
        );
    }

    renderFiltersSelector(filters) {
        const {ui: {languageId}, p} = this.props;
        const selectItems = filters.map( filter => ({
            value: filter.id,
            label: getItemLabelByNameAndType(i18n.getEntityText(filter, languageId).name, filter.type, p)
        }));

        return (
            <div className='btn-group btn-group-select-group-max'>
                <Select
                    options={selectItems}
                    value={this.getSelectedFilter().id}
                    onChange={(val) => this.onSelectChange(filters, val.value)}
                />
            </div>
        );
    }

    renderButtonGroup(isDemoSession, isFilterEditable, isFilterDuplicable, texts) {
        return (
            <div className='btn-group'>
                {isFilterDuplicable && this.renderDuplicateFilterButton(isDemoSession, texts)}
                {isFilterEditable && this.renderResetFilterButton(texts)}
                {isFilterEditable && this.renderDeleteFilterButton(texts)}
            </div>
        );
    }

    renderDuplicateFilterButton(isDemoSession, texts) {
        const title = isDemoSession ? texts.p('loginToWork') : texts.p('makeCopy');
        return (
            <button
                type='button'
                className='btn btn-default in'
                id='dblBtn'
                onClick={() => this.onDuplicateClick()}
                disabled={isDemoSession}
                title={title}
            >
                <span className='hidden-xs'>{texts.p('existentSelect.duplicate')}</span>
                <span className='visible-xs'><i className='md-i'>content_copy</i></span>
            </button>
        );
    }

    renderResetFilterButton(texts) {
        return (
            <button
                type='button'
                className='btn btn-default'
                onClick={() => this.onResetFilterClick()}
            >
                <span className='hidden-xs'>{texts.p('existentSelect.reset')}</span>
                <span className='visible-xs'><i className='md-i'>settings_backup_restore</i></span>
            </button>
        );
    }

    renderDeleteFilterButton(texts) {
        return (
            <button
                type='button'
                className='btn btn-default'
                onClick={() => this.onDeleteFilterClick()}
            >
                <span className='hidden-xs'>{texts.p('existentSelect.deleteItem')}</span>
                <span className='visible-xs'><i className='md-i'>close</i></span>
            </button>
        );
    }

    getSelectedFilter() {
        return this.props.filterBuilder.editingFilter.filter;
    }

    getFilterForId(filters, filterId) {
        return _.find(filters, {id: filterId}) || null;
    }

    onSelectChange(filters, filterId) {
        const {dispatch, ui: {languageId}} = this.props;
        dispatch(filterBuilderRestartEdit(null, this.getFilterForId(filters, filterId, languageId)));
    }

    onDuplicateClick() {
        const {dispatch, p, ui: {languageId}} = this.props;
        const filter = this.getSelectedFilter();
        const selectedFilterName = i18n.getEntityText(filter, languageId).name;
        const newFilterName = p.t('filterAndModel.copyOf', {name: selectedFilterName});
        dispatch(filterBuilderRestartEdit({name: newFilterName}, filter, languageId));
    }

    onResetFilterClick() {
        const {dispatch, ui: {languageId}} = this.props;
        const filter = this.getSelectedFilter();
        dispatch(filterBuilderRestartEdit(null, filter, languageId));
    }

    onDeleteFilterClick() {
        const {dispatch, ui: {languageId}} = this.props;
        const filterId = this.getSelectedFilter().id;
        dispatch(filterBuilderDeleteFilter(filterId, languageId));
    }

}

ExistentFilterSelect.propTypes = {
    auth: PropTypes.object.isRequired,
    filterBuilder: PropTypes.object.isRequired,
    ui: PropTypes.object.isRequired,
    texts: PropTypes.shape({p: PropTypes.func.isRequired}).isRequired,
    p: PropTypes.shape({t: PropTypes.func.isRequired}).isRequired,
    dispatch: PropTypes.func.isRequired
};

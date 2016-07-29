import _ from 'lodash';
import React from 'react';
import Select from '../../shared/Select';
import {getItemLabelByNameAndType} from '../../../utils/stringUtils';
import {
    startQueryHistoryEdit,
    cancelQueryHistoryEdit,
    editQueryHistoryItem
} from '../../../actions/queryHistory';
import immutableArray from '../../../utils/immutableArray';
import {viewBuilderStartEdit} from '../../../actions/viewBuilder';
import {filterBuilderStartEdit} from '../../../actions/filterBuilder';
import {openModal} from '../../../actions/modalWindows';


export default class AnalysisRightPane extends React.Component {

    render() {
        const {historyItem, disabled} = this.props;

        return (
            <div>
                {this.renderNewAnalysisTitle()}
                {historyItem && this.renderAnalysisHeader(historyItem, disabled)}
                <div className='split-scroll form-horizontal'>
                    <div className='form-rows'>
                        {historyItem && this.renderAnalysisContent(historyItem, disabled)}
                    </div>
                </div>
            </div>
        );
    }

    renderNewAnalysisTitle() {
        return (
            <div className='navbar navbar-fixed-top navbar-inverse visible-xs'>
                <button
                    type='button'
                    className='btn navbar-btn pull-right'
                    onClick={() => this.onNewAnalysisCancelClick()}
                >
                    <i className='md-i'>close</i>
                </button>
                <h3 className='navbar-text'>
                    New analysis
                </h3>
            </div>
        );
    }

    renderAnalysisHeader(historyItem, disabled) {
        return (
            <div className='split-right-top split-right-top-tabs form-horizontal'>
                {this.renderSelectAnalysis()}
                {this.renderDeleteAnalysis(false)}
                {this.renderAnalysisName(historyItem.name, disabled)}
                {this.renderAnalysisDates(historyItem.createdDate, historyItem.lastQueryDate)}
                {this.renderAnalysisDescription(historyItem.description, disabled)}
                {this.renderAnalysisHeaderTabs(historyItem.type, disabled)}
            </div>
        );
    }

    renderAnalysisContent(historyItem, disabled) {
        return (
            <div>
                {this.renderSamplesSelects(historyItem, disabled)}
                {this.renderFilterSelector(historyItem.filter, disabled)}
                {historyItem.type === 'family' && this.renderFamilyModelSelector(historyItem.model, disabled)}
                {historyItem.type === 'tumor' && this.renderTumorModelSelector(historyItem.model, disabled)}
                {this.renderViewSelector(historyItem.view, disabled)}
                <hr className='invisible' />
                {this.renderUseActualVersions()}
                {this.renderAnalyzeButton(!disabled)}
            </div>
        );
    }

    renderFilterSelector(filter, disabled) {
        return (
            <div>
                <h5><span data-localize='general.filter'>Filter</span></h5>
                <div className='form-group'>
                    <div className='col-xs-10 btn-group-select2'>
                        <div className='btn-group'>
                            <button
                                className='btn btn-default btn-fix-width'
                                type='button'
                                disabled={disabled}
                                onClick={() => this.onFiltersClick()}
                            >
                                <span data-localize='filters.title'>Filters</span>
                            </button>
                        </div>
                        <div className='btn-group btn-group-select2-max'>
                            <Select
                                tabIndex='-1'
                                className='select2-search'
                                id='filterSelect'
                                disabled={disabled}
                                options={this.getFilterOptions()}
                                value={filter && filter.id || null}
                                onChange={(item) => this.onFilterSelect(item.value)}
                            />
                        </div>
                        <div className='col-xs-2'></div>
                    </div>
                </div>
            </div>
        );
    }
    
    renderFamilyModelSelector(model, disabled) {
        return (
            <div id='familyModelDiv'>
                {this.renderModelSelector(model, disabled)}
            </div>
        );
    }

    renderTumorModelSelector(model, disabled) {
        return (
            <div id='tumorModelDiv'>
                {this.renderModelSelector(model, disabled)}
            </div>
        );
    }

    renderModelSelector(model, disabled) {
        return (
            <div>
                <h5><span data-localize='general.model'>Model</span></h5>
                <div className='form-group'>
                    <div className='col-md-10 col-xs-12 btn-group-select2'>
                        <div className='btn-group'>
                            <button
                                type='button'
                                className='btn btn-default btn-fix-width'
                                disabled={disabled}
                                onClick={() => this.onModelClick()}
                            >
                                <span data-localize='models.title'>Models</span>
                            </button>
                        </div>
                        <div className='btn-group btn-group-select2-max'>
                            <Select
                                id='modelSelect'
                                className='select2'
                                tabIndex='-1'
                                disabled={disabled}
                                value={model && model.id || null}
                                options={this.getModelOptions()}
                                onChange={(item) => this.onModelSelect(item.value)}
                            />
                        </div>
                    </div>

                </div>
            </div>
        );
    }

    renderViewSelector(view, disabled) {
        return (
            <div>
                <h5><span data-localize='general.view'>View</span></h5>
                <div className='form-group'>
                    <div className='col-md-10 col-xs-12 btn-group-select2'>
                        <div className='btn-group'>
                            <button
                                className='btn btn-default btn-fix-width'
                                type='button'
                                disabled={disabled}
                                onClick={() => this.onViewsClick()}
                            >
                                <span data-localize='views.title'>Views</span>
                            </button>
                        </div>
                        <div className='btn-group btn-group-select2-max'>
                            <Select
                                tabIndex='-1'
                                className='select2'
                                id='viewSelect'
                                disabled={disabled}
                                options={this.getViewOptions()}
                                value={view && view.id || null}
                                onChange={(item) => this.onViewSelect(item.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    renderSamplesSelects(historyItem, disabled) {
        const rendersForType = {
            'single': (historyItem, disabled) => (
                <div className='tab-pane active' id='single'>
                     {this.renderSampleSelectSingle(historyItem.samples[0], disabled)}
                </div>
            ),
            'tumor': (historyItem, disabled) => (
                <div className='tab-pane active' role='tabpanel' id='tumorNormal'>
                     {this.renderSamplesSelectsTumorNormalHeader()}
                     {this.renderSamplesSelectsTumorNormalSampleTumor(historyItem.samples[0], disabled)}
                     {this.renderSamplesSelectsTumorNormalSampleNormal(historyItem.samples[1], disabled)}
                     <hr className='invisible' />
                </div>
            ),
            'family': (historyItem, disabled) => (
                <div className='tab-pane active' role='tabpanel' id='family'>
                     {this.renderSamplesSelectsFamilyHeader()}
                     {historyItem.samples.map( (sample, i) =>
                         sample.type === 'proband' ?
                             this.renderSamplesSelectsFamilyProband(sample, disabled, i) :
                             this.renderSamplesSelectsFamilyMember(sample, disabled, i)
                     )}
                     <hr className='invisible' />
                </div>
            )
        };

        const typeRender = rendersForType[historyItem.type];
        console.log(historyItem);
        return (
            <div className='tab-content'>
                {typeRender && typeRender(historyItem, disabled)}
            </div>
        );
    }

    renderSampleSelectSingle(sample, disabled) {
        return (
            <div>
                <h5><span data-localize='general.sample'>Sample</span></h5>
                <div className='form-group'>
                    <div className='col-xs-10 btn-group-select2'>
                        <div className='btn-group'>
                            <button
                                className='btn btn-default btn-fix-width'
                                disabled={disabled}
                                onClick={() => this.onSamplesClick(0)}
                            >
                                <span data-localize='samples.title'>Samples</span>
                            </button>
                        </div>

                        <div className='btn-group btn-group btn-group-left'>
                            <label className='label label-dark-default label-fix-width label-left'>
                                <span data-localize='query.single.title'>Single</span>
                            </label>
                        </div>
                        <div className='btn-group btn-group-select2-max btn-group-right'>
                            <Select
                                className='select2-search select-right'
                                tabindex='-1'
                                disabled={disabled}
                                value={sample && sample.id || null}
                                options={this.getSampleOptions()}
                                onChange={(item) => this.onSampleSelect(0, item.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    renderSamplesSelectsTumorNormalHeader() {
        return (
            <h5><span data-localize='samples.title'>Samples</span></h5>
        );
    }

    renderSamplesSelectsTumorNormalSampleTumor(sample, disabled) {
        return (
            <div className='form-group'>
                <div className='col-xs-10 btn-group-select2 '>
                    <div className='btn-group'>
                        <button
                            className='btn btn-default btn-fix-width'
                            disabled={disabled}
                            onClick={() => this.onSamplesClick(0)}
                        >
                            <span data-localize='samples.title'>Samples</span>
                        </button>
                    </div>
                    <div className='btn-group btn-group-left'>
                        <label className='label label-dark-default  label-fix-width label-left'>
                            <span data-localize='query.tumor_normal.tumor.title'>Tumor</span>
                        </label>
                    </div>
                    <div className='btn-group btn-group-select2-max'>
                        <Select
                            className='select2-search'
                            tabindex='-1'
                            disabled={disabled}
                            value={sample && sample.id || null}
                            options={this.getSampleOptions()}
                            onChange={(item) => this.onSampleSelect(0, item.value)}
                        />
                    </div>
                </div>
            </div>
        );
    }

    renderSamplesSelectsTumorNormalSampleNormal(sample, disabled) {
        return (
            <div className='form-group'>
                <div className='col-xs-10 btn-group-select2 '>
                    <div className='btn-group'>
                        <button
                            className='btn btn-default btn-fix-width'
                            disabled={disabled}
                            onClick={() => this.onSamplesClick(1)}
                        >
                            <span data-localize='samples.title'>Samples</span>
                        </button>
                    </div>
                    <div className='btn-group btn-group-left'>
                        <label className='label label-default  label-fix-width label-left'>
                            <span data-localize='query.tumor_normal.normal.title'>Normal</span>
                        </label>
                    </div>
                    <div className='btn-group btn-group-select2-max btn-group-right'>
                        <Select
                            tabindex='-1'
                            className='select2-search select-right'
                            disabled={disabled}
                            value={sample && sample.id || null}
                            options={this.getSampleOptions()}
                            onChange={(item) => this.onSampleSelect(1, item.value)}
                        />
                    </div>
                </div>
            </div>
        );
    }

    renderSamplesSelectsFamilyHeader() {
        return (
            <h5><span data-localize='samples.title'>Samples</span></h5>
        );
    }

    renderSamplesSelectsFamilyProband(sample, disabled, i) {
        return (
            <div className='form-group' key={i}>
                <div className='col-xs-10 btn-group-select2'>
                    <div className='btn-group'>
                        <button
                            className='btn btn-default btn-fix-width'
                            disabled={disabled}
                            onClick={() => this.onSamplesClick(0)}
                        >
                            <span data-localize='samples.title'>Samples</span>
                        </button>
                    </div>
                    <div className='btn-group btn-group-left'>
                        <label className='label label-dark-default label-fix-width label-left'>
                            <span data-localize='query.family.proband.title'>Proband</span>
                        </label>
                    </div>
                    <div className='btn-group btn-group-select2-max btn-group-right'>
                        <Select
                            className='select2-search select-right'
                            tabindex='-1'
                            disabled={disabled}
                            value={sample && sample.id || null}
                            options={this.getSampleOptions()}
                            onChange={(item) => this.onSampleSelect(0, item.value)}
                        />
                    </div>
                </div>
            </div>
        );
    }

    renderSamplesSelectsFamilyMember(sample, disabled, i) {
        return (
            <div className='form-group' key={i}>
                <div className='col-xs-10 btn-group-select2'>
                    <div className='btn-group'>
                        <button
                            className='btn btn-default btn-fix-width'
                            disabled={disabled}
                            onClick={() => this.onSamplesClick(i)}
                        >
                            <span data-localize='samples.title'>Samples</span>
                        </button>
                    </div>
                    <div className='btn-group btn-group-left'>
                        <Select
                            tabindex='-1'
                            className='select2 select2-default select-left select2-sign'
                            disabled={disabled}
                            value={sample && sample.type || null}
                            options={this.getFamilyMemberOptions()}
                            onChange={(item) => this.onFamilyMemberSelect(i, item.value)}
                        />
                    </div>
                    <div className='btn-group btn-group-select2-max btn-group-right'>
                        <Select
                            tabindex='-1'
                            className='select2-search select-right select-right'
                            disabled={disabled}
                            value={sample && sample.id || null}
                            options={this.getSampleOptions()}
                            onChange={(item) => this.onSampleSelect(i, item.value)}
                        />
                    </div>
                </div>
            </div>
        );
    }

    renderUseActualVersions() {
        return (
            <div className='form-group'>
                <div className='col-sm-6 col-xs-12'>
                    <label className='checkbox checkbox-inline' data-localize='query.reanalyze.help' title='Click for analyze with actual filters and view'>
                        <input
                            type='checkbox'
                            onClick={(e) => this.onUseActionVersionsToggle(e.target.checked)}
                        />
                        <i/> <span data-localize='query.reanalyze.title'>Use actual versions filter, model, view</span>
                    </label>
                </div>
            </div>
        );
    }

    renderAnalyzeButton(isEditing) {
        return (
            <div className='form-group'>
                <div className='col-xs-12'>
                    {
                        isEditing ?
                            <button
                                className='btn btn-primary'
                                title='Click for cancel'
                                onClick={() => this.onCancelButtonClick()}
                            >
                                <span>Cancel</span>
                            </button>
                            :
                            <button
                                className='btn btn-primary'
                                title='Click for edit'
                                onClick={() => this.onEditButtonClick()}
                            >
                                <span>Edit</span>
                            </button>
                    }
                    <button
                        className='btn btn-primary'
                        title='Click for analyze with analysis initial versions of filter and view'
                        onClick={() => this.onAnalyzeButtonClick()}
                    >
                        <span data-localize='query.analyze.title'>Analyze</span>
                    </button>
                </div>
            </div>
        );
    }

    renderSelectAnalysis() {
        return (
            <div className='navbar navbar-list-toggle visible-xs'>
                <button
                    id='openAnalisis'
                    type='button'
                    className='btn btn-link-default navbar-btn'
                    onClick={() => this.onSelectAnalysisClick()}
                >
                    <i className='md-i'>menu</i>
                    <span data-localize='query.select_analysis'>Select analysis</span>
                </button>
            </div>
        );
    }

    renderDeleteAnalysis(disabled) {
        return (
            <button
                className='btn btn-sm btn-link-light-default pull-right btn-right-in-form'
                disabled={disabled}
                onClick={() => this.onDeleteAnalysisClick()}
            >
                <span data-localize='query.delete_analysis'>Delete analysis</span>
            </button>
        );
    }

    renderAnalysisName(name, disabled) {
        return (
            <div className='form-group'>
                <div className='col-md-12 col-xs-12'>
                    <input
                        value={name}
                        className='form-control material-input-sm material-input-heading text-primary'
                        placeholder="Analysis name (it can't be empty)"
                        data-localize='query.settings.name'
                        disabled={disabled}
                        onChange={(e) => this.onAnalysisNameChange(e.target.value)}
                    />
                </div>
            </div>
        );
    }

    renderAnalysisHeaderTabs(historyItemType, disabled) {
        const tabs = [
            {
                isActive: historyItemType === 'single',
                className: 'single-tab',
                caption: 'Single',
                onSelect: () => this.dispatchEdit({type: 'single'})
            },
            {
                isActive: historyItemType === 'tumor',
                className: 'tumor-normal-tab',
                caption: 'Tumor/Normal',
                onSelect: () => this.dispatchEdit({type: 'tumor'})
            },
            {
                isActive: historyItemType === 'family',
                className: 'family-tab',
                caption: 'Family',
                onSelect: () => this.dispatchEdit({type: 'family'})
            }
        ];
        return (
            <ul role='tablist' className='nav nav-tabs' id='analisisTypes'>
                {tabs.filter((tab) => tab.isActive || !disabled).map((tab) => this.renderAnalysisHeaderTab(tab.isActive, tab.className, tab.caption, tab.onSelect))}
            </ul>
        );
    }
    
    renderAnalysisDates(createdDate, lastQueryDate) {
        return (
            <div className='label-date'>
                <label>
                    <span data-localize='general.created_date'>Created date</span>: <span>{createdDate}</span>
                </label>
                <label>
                    <span data-localize='query.last_query_date'>Last query date</span>: <span>{lastQueryDate}</span>
                </label>
            </div>
        );
    }

    renderAnalysisDescription(description, disabled) {
        return (
            <div className='form-group'>
                <div className='col-md-12 col-xs-12'>
                    <input
                        value={description}
                        placeholder='Analysis description (optional)'
                        className='form-control material-input-sm'
                        data-localize='query.settings.description'
                        disabled={disabled}
                        onChange={(e) => this.onAnalysisDescriptionChange(e.target.value)}
                    />
                </div>
            </div>
        );
    }

    renderAnalysisHeaderTab(isActive, tabClassName, tabCaption, onClick) {
        return (
            <li
                key={tabClassName}
                className={tabClassName + ' ' + (isActive ? 'active' : '')}
                role='presentation'
            >
                <a
                    role='tab'
                    onClick={onClick}
                >
                    <span data-localize='query.single.title'>
                        {tabCaption}
                    </span>
                </a>
            </li>
        );
    }

    isViewDisabled(view) {
        const {auth} = this.props;
        return auth.isDemo && view.type == 'advanced';
    }

    getViewOptions() {
        const views = this.props.viewsList.hashedArray.array;
        return views.map(
            (viewItem) => {
                const isDisabled = this.isViewDisabled(viewItem);
                const label = getItemLabelByNameAndType(viewItem.name, viewItem.type);
                return {
                    value: viewItem.id, label, disabled: isDisabled
                };
            }
        );
    }

    isFilterDisabled(filter) {
        const {auth} = this.props;
        return auth.isDemo && filter.type == 'advanced';
    }

    getFilterOptions() {
        const filters = this.props.filtersList.hashedArray.array;
        return filters.map((filterItem) => {
            const isDisabled = this.isFilterDisabled(filterItem);
            const label = getItemLabelByNameAndType(filterItem.name, filterItem.type);
            return {
                value: filterItem.id, label, disabled: isDisabled
            };
        });
    }

    isModelDisabled(model) {
        const {auth} = this.props;
        return auth.isDemo && model.type == 'advanced';
    }

    getModelOptions() {
        const {models} = this.props.modelsList;
        return models.map((sampleItem) => {
            const isDisabled = this.isModelDisabled(sampleItem);
            const label = getItemLabelByNameAndType(sampleItem.name, sampleItem.type);
            return {value: sampleItem.id, label, disabled: isDisabled};
        });
    }

    isSampleDisabled(sample) {
        const {auth} = this.props;
        return auth.isDemo && sample.type == 'advanced';
    }

    getSampleOptions() {
        const samples = this.props.samplesList.hashedArray.array;
        return samples.map((sampleItem) => {
            const isDisabled = this.isSampleDisabled(sampleItem);
            const label = getItemLabelByNameAndType(sampleItem.fileName, sampleItem.type);
            return {value: sampleItem.id, label, disabled: isDisabled};
        });
    }

    getFamilyMemberOptions() {
        return [
            {value: 'mother', label: 'Mother'},
            {value: 'father', label: 'Father'}
        ];
    }

    onNewAnalysisCancelClick() {

    }

    onSelectAnalysisClick() {

    }

    onDeleteAnalysisClick() {

    }

    onAnalysisNameChange(name) {
        console.log('onAnalysisNameChange', name);
        this.dispatchEdit({name: name});
    }

    onAnalysisDescriptionChange(description) {
        console.log('onAnalysisDescriptionChange', description);
        this.dispatchEdit({description: description});
    }

    onUseActionVersionsToggle(use) {
        console.log('onUseActionVersionsToggle', use);
    }

    onEditButtonClick() {
        this.props.dispatch(startQueryHistoryEdit(this.props.historyItem.id));
    }

    onCancelButtonClick() {
        this.props.dispatch(cancelQueryHistoryEdit(this.props.historyItem.id));
    }

    onAnalyzeButtonClick() {

    }

    onViewsClick() {
        this.props.dispatch(viewBuilderStartEdit(false, this.props.historyItem.view));
        this.props.dispatch(openModal('views'));
    }

    onViewSelect(viewId) {
        const {viewsList: {hashedArray: {hash: viewsHash}}} = this.props;
        this.dispatchEdit({
            view: viewsHash[viewId]
        });
    }
    
    onFiltersClick() {
        this.props.dispatch(filterBuilderStartEdit(false, this.props.historyItem.filter, this.props.fields));
        this.props.dispatch(openModal('filters'));
    }

    onFilterSelect(filterId) {
        const {filtersList: {hashedArray: {hash: filtersHash}}} = this.props;
        this.dispatchEdit({
            filter: filtersHash[filterId]
        });
    }

    onModelClick() {

    }

    onModelSelect(modelId) {
        const {modelsList: {models}} = this.props;
        this.dispatchEdit({
            model: _.find(models, {id: modelId})
        });
    }
    
    onSamplesClick() {
        
    }
    
    onSampleSelect(sampleIndex, sampleId) {
        const {historyItem} = this.props;
        this.dispatchEdit({
            samples: immutableArray.replace(historyItem.samples, sampleIndex, {...historyItem.samples[sampleIndex], id: sampleId})
        });
    }

    onFamilyMemberSelect(sampleIndex, familyMemberId) {
        const {historyItem} = this.props;
        this.dispatchEdit({
            samples: immutableArray.replace(historyItem.samples, sampleIndex, {...historyItem.samples[sampleIndex], type: familyMemberId})
        });
    }

    dispatchEdit(change) {
        const {dispatch, historyItem, samplesList, filtersList, viewsList, modelsList} = this.props;
        dispatch(editQueryHistoryItem(
            historyItem.id,
            samplesList,
            filtersList,
            viewsList,
            modelsList,
            change,
            historyItem));
    }
}
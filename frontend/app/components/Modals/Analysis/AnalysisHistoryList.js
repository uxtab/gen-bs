import React from 'react';
import classNames from 'classnames';
import {requestAppendQueryHistory} from '../../../actions/queryHistory';


export default class AnalysisHistoryList extends React.Component {
    render() {
        const {currentItemId, historyList, newHistoryItem, editingHistoryList} = this.props;
        return (
            <div className='split-scroll' ref='analysisHistoryListContainer'>
                <ul id='analysisTabs' className='nav nav-componets nav-controls nav-radios'>
                    {this.renderNewListItem(!currentItemId, newHistoryItem)}
                    {historyList.map((historyItem) => this.renderListItem(historyItem.id === currentItemId, !!editingHistoryList[historyItem.id], historyItem))}
                    {!this.props.isHistoryReceivedAll && this.renderLoadingListItem()}
                </ul>
            </div>
        );
    }

    componentDidMount() {
        const containerElement = this.refs.analysisHistoryListContainer;
        const loadingElement = this.refs.analysisHistoryListLoading;

        const self = this;

        function f() {
            if (!self.props.isHistoryReceivedAll) {
                if (loadingElement.offsetTop < containerElement.scrollTop + containerElement.clientHeight) {
                    self.props.dispatch(requestAppendQueryHistory(self.props.historyListFilter, 2, self.props.historyList.length));
                }
            }
            setTimeout(f, 1000);
        }
        f();
    }

    renderNewListItem(isActive, item) {
        return this.renderListItem(isActive, true, item);
    }

    renderListItem(isActive, isEditing, historyItem) {
        return (
            <li
                key={historyItem.id}
                className={classNames({
                    'active': isActive,
                    'editing': isEditing
                })}
            >
                <a
                    type='button'
                    onClick={() => this.onHistoryItemClick(historyItem.id)}
                >
                    <label className='radio'>
                        <input type='radio' name='viewsRadios' />
                        <i />
                    </label>
                    <span className='link-label'>
                        {historyItem.name}
                    </span>
                    <span className='link-desc'>
                        {historyItem.description}
                    </span>
                    <span className='small link-desc'>
                        <span data-localize='query.last_query_date'>
                            Last query date
                        </span>: {historyItem.lastQueryDate}
                    </span>
                </a>
            </li>
        );
    }

    renderLoadingListItem() {
        return (
            <li className='loading' ref='analysisHistoryListLoading'>
                Loading...
            </li>
        );
    }

    onHistoryItemClick(id) {
        this.props.onSelectHistory(id);
    }
}
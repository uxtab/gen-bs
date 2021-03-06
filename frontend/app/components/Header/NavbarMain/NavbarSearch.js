import React, {Component} from 'react';
import {connect} from 'react-redux';
import classNames from 'classnames';

import config from '../../../../config';


class NavbarSearch extends Component {
    constructor(props) {
        super(props);
        this.state = {
            initialSearch: this.props.search,
            search: this.props.search,
            showPopup: false
        };
    }

    componentWillReceiveProps(newProps) {
        this.setState({
            initialSearch: newProps.search,
            search: newProps.search
        });
    }

    render() {
        const {p, isVariantsLoading, isVariantsValid, isFetching, isFilteringOrSorting} = this.props;
        const isEnabled = !isVariantsLoading && isVariantsValid && !isFetching && !isFilteringOrSorting;
        return (
            <div className='navbar-search'>
                <a
                    className='btn navbar-btn btn-block visible-xs'
                    type='button'
                    onClick={() => this.onSearchPopupToggle(true)}
                >
                    <i className='md-i'>search</i>
                </a>
                <div
                    className={classNames('navbar-search-field navbar-search-xs', {'hidden-xs': !this.state.showPopup})}
                >
                    <input
                        type='text'
                        className='form-control placeholder-inverse'
                        placeholder={p.t('navBar.searchPlaceholder')}
                        onChange={(e) => this.onGlobalSearchInputChanged(e)}
                        onKeyPress={(e) => this.onGlobalSearchInputKeyPressed(e)}
                        onBlur={() => this.onGlobalSearchInputBlur()}
                        disabled={!isEnabled}
                        value={this.state.search}
                        maxLength={config.ANALYSIS.MAX_FILTER_LENGTH}
                    />
                    <a
                        type='button'
                        className='btn btn-link-inverse btn-field-clean visible-xs'
                        id='closeMobileSearch'
                        onClick={() => this.onSearchPopupToggle(false)}
                    >
                        <i className='md-i'>close</i>
                    </a>
                </div>
            </div>
        );
    }

    onGlobalSearchInputChanged(e) {
        this.setState({
            search: e.target.value
        });
    }

    onGlobalSearchInputKeyPressed(e) {
        // user pressed "enter"
        if (e.charCode === 13) {
            const {search} = this.state;
            const {onGlobalSearchRequested} = this.props;
            onGlobalSearchRequested(search);
        }
    }

    onGlobalSearchInputBlur() {
        this.setState({
            search: this.state.initialSearch
        });
    }

    onSearchPopupToggle(show) {
        this.setState({
            showPopup: show
        });
    }
}

function mapStateToProps(state) {
    const {
        websocket: {isVariantsLoading, isVariantsValid},
        variantsTable: {isFetching, isFilteringOrSorting}
    } = state;
    return {isVariantsLoading, isVariantsValid, isFetching, isFilteringOrSorting};
}

NavbarSearch.propTypes = {
    isVariantsLoading: React.PropTypes.bool.isRequired,
    isVariantsValid: React.PropTypes.bool.isRequired,
    // callback(globalSearchString)
    onGlobalSearchRequested: React.PropTypes.func.isRequired,
    search: React.PropTypes.string.isRequired,
    p: React.PropTypes.shape({t: React.PropTypes.func.isRequired}).isRequired,
    isFetching: React.PropTypes.bool.isRequired,
    isFilteringOrSorting: React.PropTypes.bool.isRequired
};

export default connect(mapStateToProps)(NavbarSearch);

import React, {Component} from 'react';
import {connect} from 'react-redux';

import Upload from './NavbarCreateQuery/Upload';
import MetadataSearch from './NavbarCreateQuery/MetadataSearch';
import FiltersSetup from './NavbarCreateQuery/FiltersSetup';
import Filters from './NavbarCreateQuery/Filters';
import ViewsSetup from './NavbarCreateQuery/ViewsSetup';
import Views from './NavbarCreateQuery/Views';
import Analyze from './NavbarCreateQuery/Analyze';
import LoadHistory from './NavbarCreateQuery/LoadHistory';
import {fetchFields} from '../../actions/fields';

import { analyze } from '../../actions/ui';
import { changeSample } from '../../actions/samplesList';


class NavbarCreateQuery extends Component {

    onSampleSelected(sampleId) {
        const { dispatch } = this.props;
        dispatch(changeSample(sampleId));
        dispatch(fetchFields(sampleId));
    }

    render() {

        const { dispatch, auth: {isDemo: isDemoSession}, samples } = this.props;
        const {selectedViewId} = this.props.viewsList;
        const {selectedFilterId} = this.props.filtersList;
        const {selectedSample} = this.props.samplesList;
        const selectedSampleId = selectedSample ? selectedSample.id : null;

        return (

            <nav className='navbar navbar-fixed-top navbar-default'>
                <div className='container-fluid'>
                    <div className='table-row'>
                        <Upload
                            {...this.props}
                        />

                        <MetadataSearch samples={samples}
                                        selectedSampleId={selectedSampleId}
                                        isDemoSession={isDemoSession}
                                        onSampleChangeRequested={(sampleId) => this.onSampleSelected(sampleId) }
                        />
                        <FiltersSetup
                            {...this.props}
                        />
                        <Filters
                            {...this.props}
                        />
                        <ViewsSetup
                            {...this.props}
                        />
                        <Views
                            {...this.props}
                        />

                        <Analyze
                            {...this.props}
                            clicked={ () => dispatch(analyze(selectedSample.id, selectedViewId, selectedFilterId))}
                        />
                        <LoadHistory
                            dispatch={this.props.dispatch}
                        />
                    </div>
                </div>
            </nav>

        );
    }
}

function mapStateToProps(state) {
    const {
        modalWindows,
        ui,
        auth,
        samplesList,
        samplesList: {
            samples // TODO why not use samplesList.samples?
        },
        filtersList,
        viewsList
    } = state;

    return {
        modalWindows,
        samples,
        ui,
        auth,
        samplesList,
        filtersList,
        viewsList
    };
}

export default connect(mapStateToProps)(NavbarCreateQuery);


import React, { Component } from 'react';
import Perf from 'react-addons-perf';


export default class CreateQeuryNavbarButton extends Component {
    constructor(props) {
        super(props);

        this.enablePerformanceControls = false;
    }

    onStop() {
        Perf.stop();
        const measurements = Perf.getLastMeasurements();
        console.log('Overall: ');
        Perf.printInclusive(measurements);
        console.log('Without component mounting:');
        Perf.printExclusive(measurements);
        console.log('Wasted');
        Perf.printWasted(measurements);
    }

    render() {
        return (
            <div>
                <div>
                    <a onClick={this.props.toggleQueryNavbar} type='button' href='#' className='btn navbar-btn'
                       id='btnToggle'>
                        <span className='hidden-xxs' data-localize='query.help' data-toggle='tooltip'
                              data-placement='right' title='Open navbar and create new analises query'
                              data-container='body' data-trigger='hover'>Analyze</span>
                        <span className='visible-xxs'><i className='md-i'>settings</i></span>
                    </a>
                    {this.enablePerformanceControls &&
                    <div>
                        <button onClick={() => Perf.start()}>B</button>
                        <button onClick={() => this.onStop()}>E</button>
                    </div>
                    }
                </div>
            </div>
        );
    }
}

import _ from 'lodash';
import React from 'react';
import classNames from 'classnames';

import ComponentBase from '../shared/ComponentBase';

import VariantsTableComment from './VariantsTableComment';


export default class VariantsTableRow extends ComponentBase {
    render() {
        const {
            row,
            auth,
            rowIndex,
            variantsHeader,
            sortState,
            fields,
            isSelected
        } = this.props;
        const rowFields = row.fields;
        const comments = row.comments;

        const pos = this.getMainFieldValue('POS', rowFields, fields, variantsHeader); // FIXME change mandatory fields get
        const alt = this.getMainFieldValue('ALT', rowFields, fields, variantsHeader);
        const chrom = this.getMainFieldValue('CHROM', rowFields, fields, variantsHeader);
        const ref = this.getMainFieldValue('REF', rowFields, fields, variantsHeader);
        const searchKey = row.searchKey;

        return (
            <tr>
                <td className='btntd row_checkbox'>
                    <div>{rowIndex + 1}</div>
                </td>
                <td className='btntd row_checkbox'
                    key='row_checkbox'>
                    <div>
                        <label className='checkbox'>
                            <input type='checkbox'
                                   checked={isSelected}
                                   onChange={() => this.onRowSelectionChanged()}
                            />
                            <i/>
                        </label>
                        <span />
                    </div>
                </td>
                <td className='btntd'>
                    <div>
                    </div>
                </td>
                <VariantsTableComment alt={alt}
                                      pos={pos}
                                      reference={ref}
                                      chrom={chrom}
                                      searchKey={searchKey}
                                      dispatch={this.props.dispatch}
                                      auth={auth}
                                      comments={comments}
                />
                {_.map(rowFields, (value, index) =>
                    this.renderFieldValue(variantsHeader[index].fieldId, variantsHeader[index].sampleId, value, sortState)
                )}
            </tr>
        );
    }

    onRowSelectionChanged() {
        const {onSelected, rowIndex, isSelected} = this.props;
        onSelected(rowIndex, !isSelected);
    }

    getMainFieldValue(colName, rowFields, fields, variantsHeader) {
        const mainField = _.find(fields.totalFieldsHashedArray.array, field => field.name === colName);
        const index = _.findIndex(variantsHeader, field => field.fieldId === mainField.id);
        return rowFields[index];
    }


    renderFieldValue(fieldId, sampleId, value, sortState) {
        const resultFieldValue = value;
        const columnSortParams = _.find(sortState, {fieldId, sampleId});

        const sortedActiveClass = classNames({
            'active': columnSortParams
        });

        return (
            <td className={sortedActiveClass}
                key={fieldId + '-' + sampleId}>
                <div>
                    {resultFieldValue || ''}
                </div>
            </td>
        );
    }

    shouldComponentUpdate(nextProps) {
        return this.props.row !== nextProps.row
            || this.props.isSelected !== nextProps.isSelected;
    }
}

VariantsTableRow.propTypes = {
    row: React.PropTypes.object.isRequired,
    rowIndex: React.PropTypes.number.isRequired,
    sortState: React.PropTypes.array.isRequired,
    auth: React.PropTypes.object.isRequired,
    dispatch: React.PropTypes.func.isRequired,
    isSelected: React.PropTypes.bool.isRequired,
    // callback(rowIndex, isSelected)
    onSelected: React.PropTypes.func.isRequired
};

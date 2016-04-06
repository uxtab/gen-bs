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
            currentView,
            sortState,
            fields,
            isSelected
        } = this.props;
        const rowFieldsHash = row.fieldsHash;
        const rowFields = row.fields;
        const comments = row.comments;
        const viewFields = currentView.viewListItems;

        const pos = this.getMainFieldValue('POS', rowFields, fields);
        const alt = this.getMainFieldValue('ALT', rowFields, fields);
        const chrom = this.getMainFieldValue('CHROM', rowFields, fields);
        const ref = this.getMainFieldValue('REF', rowFields, fields);
        const searchKey = row.searchKey;

        return (
            <tr>
                <td className="btntd row_checkbox">{rowIndex + 1}</td>
                <td className="btntd row_checkbox"
                    key="row_checkbox">
                    <div>
                        <label className="checkbox">
                            <input type="checkbox"
                                   checked={isSelected}
                                   onChange={() => this.onRowSelectionChanged()}
                            />
                            <i/>
                        </label>
                        <span />
                    </div>
                </td>
                <td className="btntd">
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
                {_.map(viewFields, (field) => this.renderFieldValue(field, sortState, rowFieldsHash))}
            </tr>
        );
    }

    onRowSelectionChanged() {
        const {onSelected, row, rowIndex, isSelected} = this.props;
        onSelected(row, rowIndex, !isSelected);
    }

    getMainFieldValue(colName, rowFields, fields) {
        const mainField = _.find(fields.totalFieldsList, field => field.name === colName);
        return _.find(rowFields, field => field.fieldId === mainField.id).value
    }


    renderFieldValue(field, sortState, rowFields) {
        const fieldId = field.fieldId;
        const resultFieldValue = rowFields[fieldId];
        let columnSortParams = _.find(sortState, sortItem => sortItem.fieldId === fieldId);

        let sortedActiveClass = classNames({
            'active': columnSortParams
        });

        return (
            <td className={sortedActiveClass}
                key={fieldId}>
                <div>
                    {resultFieldValue || ''}
                </div>
            </td>
        );
    }

    shouldComponentUpdate(nextProps, nextState) {
        return this.props.row !== nextProps.row
            || this.props.isSelected !== nextProps.isSelected;
    }
}

VariantsTableRow.propTypes = {
    row: React.PropTypes.object.isRequired,
    rowIndex: React.PropTypes.number.isRequired,
    currentView: React.PropTypes.object.isRequired,
    sortState: React.PropTypes.array.isRequired,
    auth: React.PropTypes.object.isRequired,
    dispatch: React.PropTypes.func.isRequired,
    isSelected: React.PropTypes.bool.isRequired,
    // callback(row, rowIndex, isSelected)
    onSelected: React.PropTypes.func.isRequired
};

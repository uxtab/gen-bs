import React, {Component} from 'react';


/**

 Inner structure:

FilterQueryBuilder(
     fields: {{id: string, label: string, type: string}[]}
     rules: {{ <'$and'|'$or'>: ({id, label, type}|rules)[] }}
     disabled: boolean
     dispatch: function(Object)
)
    QueryBuilder(
        rules: {{condition: string, rules: {condition?: *, field?: string, operator?: string, value?: *}[]}}
        disabled: boolean
        makeItemComponent: function(number[], {field: string, operator: string, value: *}, boolean): Component
        handlers: {
            onSwitch: function(number[], boolean),
            onAdd: function(number[], boolean),
            onDeleteGroup: function(number[]),
            onDeleteItem: function(number[], boolean)
        }
    )
        RulesGroupContainer(
            indexPath: number[] // [] - root, [1, 2] - 2nd child at 1st child of root
            makeItemComponent: = makeItemComponent
            ruleItems: {condition?: *, field?: string, operator?: string, value?: *}[]
            ruleIsAnd: boolean
            disabled: = disabled
            handlers: = handlers
        )
            RulesGroupHeader(
                indexPath: = indexPath
                disabled: = disabled
                isAnd: = ruleIsAnd
                onSwitch: function(boolean)
                onAdd: function(boolean)
                onDelete: function()
            )
            RulesGroupBody(
                indexPath: = indexPath
                items: = ruleItems
                disabled: = disabled
                makeItemComponent: = makeItemComponent
                handlers: = handlers
            )
                RulesGroupContainer(...)
                RuleContainer(
                    indexPath: number[]
                    item: {condition?: *, field?: string, operator?: string, value?: *}
                    disabled: = disabled
                    makeItemComponent: = makeItemComponent
                    onDelete: ?function()
                )
                    itemComponent(
                        number[],
                        {field: string, operator: string, value: *},
                        boolean
                    )
 */

    
export default class QueryBuilder extends Component {

    render() {
        const {
            /** @type {{condition: string, rules: {condition: *=, field: string=, operator: string=, value: *=}[]}} */
            rules,
            /** @type {boolean} */
            disabled,
            /** @type {function(number[], {}, boolean): Component} */
            makeItemComponent,
            /** @type {{onSwitch: (function(number[], boolean)), onAdd: (function(number[], boolean)), onDeleteGroup: (function(number[])), onDeleteItem: (function(number[], number))}} */
            handlers
        } = this.props;

        return (
            <div>
                <div className="query-builder">
                    <RulesGroupContainer
                        indexPath={[]}
                        makeItemComponent={makeItemComponent}
                        ruleItems={rules.rules}
                        ruleIsAnd={rules.condition == 'AND'}
                        disabled={disabled}
                        handlers={handlers}
                    />
                </div>
            </div>
        );
    }
}

class RulesGroupContainer extends Component {

    render() {
        const {
            /** @type {number[]} */
            indexPath,
            /** @type {function(number[], {}, boolean): Component} */
            makeItemComponent,
            /** @type {{condition: *=, field: string=, operator: string=, value: *=}[]} */
            ruleItems,
            /** @type {boolean} */
            ruleIsAnd,
            /** @type {boolean} */
            disabled,
            /** @type {{onSwitch: (function(number[], boolean)), onAdd: (function(number[], boolean)), onDeleteGroup: (function(number[])), onDeleteItem: (function(number[], number))}} */
            handlers
        } = this.props;

        return (
            <dl className="rules-group-container">
                <RulesGroupHeader
                    indexPath={indexPath}
                    disabled={disabled}
                    isAnd={ruleIsAnd}
                    onSwitch={ (isAnd) => { handlers.onSwitch(indexPath, isAnd); }  }
                    onAdd={ (isGroup) => { handlers.onAdd(indexPath, isGroup); } }
                    onDelete={ () => { handlers.onDeleteGroup(indexPath); } }
                />
                <RulesGroupBody
                    indexPath={indexPath}
                    items={ruleItems}
                    disabled={disabled}
                    makeItemComponent={makeItemComponent}
                    handlers={handlers}
                />
            </dl>
        );
    }
}

class RulesGroupHeader extends Component {

    /**
     * @param {string} caption
     * @param {boolean} disabled
     * @param {function()} onAdd
     * @returns {XML}
     */
    static renderAddButton(caption, disabled, onAdd) {
        return (
            <button type="button" className="btn btn-xs btn-success" disabled={disabled} onClick={onAdd}>
                <i className="glyphicon glyphicon-plus"/> {caption}
            </button>
        );
    }

    /**
     * @param {string} caption
     * @param {boolean} value
     * @param {string} groupName
     * @param {boolean} isOn
     * @param {boolean} disabled
     * @param {function(boolean)} onSwitch
     * @returns {Component}
     */
    static renderRadioButton(caption, value, groupName, isOn, disabled, onSwitch) {
        return (
            <label className={"btn btn-xs btn-default " + (isOn ? 'active': '')}>
                <input
                    type="radio"
                    name={groupName}
                    value={value}
                    disabled={disabled}
                    checked={isOn}
                    onChange={ () => onSwitch(value) } />
                {caption}
            </label>
        );
    }


    render() {
        const {
            /** @type {number[]} */
            indexPath,
            /** @type {boolean} */
            isAnd,
            /** @type {boolean} */
            disabled,
            /** @type {function(boolean)} */
            onSwitch,
            /** @type {function(boolean)} */
            onAdd,
            /** @type {?function()} */
            onDelete
        } = this.props;

        const groupName = 'builder-basic-react_group_' + indexPath.join('-') + '_cond';

        return (
            <dt className="rules-group-header">
                <div className="btn-group pull-right group-actions">
                    {RulesGroupHeader.renderAddButton('Add rule', disabled, () => { onAdd(false); })}
                    {RulesGroupHeader.renderAddButton('Add group', disabled, () => { onAdd(true); })}
                    <button type="button" className="btn btn-xs btn-danger" onClick={onDelete} disabled={disabled} >
                        <i className="glyphicon glyphicon-remove" /> Delete
                    </button>
                </div>
                <div className="btn-group group-conditions">
                    {RulesGroupHeader.renderRadioButton('AND', true, groupName, isAnd, disabled, onSwitch)}
                    {RulesGroupHeader.renderRadioButton('OR', false, groupName, !isAnd, disabled, onSwitch)}
                </div>
                <div className="error-container"><i className="glyphicon glyphicon-warning-sign" /></div>
            </dt>
        );
    }
}

class RuleContainer extends Component {
    render() {
        const {
            /** @type {{condition: *=, field: string=, operator: string=, value: *=}} */
            item,
            /** @type {number[]} */
            indexPath,
            /** @type {boolean} */
            disabled,
            /** @type {?function()} */
            onDelete,
            /** @type {function(number[], {}, boolean): Component} */
            makeItemComponent
        } = this.props;

        return (
            <li className="rule-container">
                <div className="rule-header">
                    <div className="btn-group pull-right rule-actions">
                        <button
                            type="button"
                            className="btn btn-xs btn-danger"
                            onClick={onDelete}
                            disabled={disabled || !onDelete}
                        >
                            <i className="glyphicon glyphicon-remove"/> Delete
                        </button>
                    </div>
                </div>
                <div className="error-container"><i className="glyphicon glyphicon-warning-sign" /></div>
                {makeItemComponent(indexPath, item, disabled)}
            </li>
        );
    }
}


class RulesGroupBody extends Component {

    /**
     * @param {({condition: string, rules: Array}|{field: string, operator: string, value: *})[]} items
     * @param {number[]} indexPath
     * @param {boolean} disabled
     * @param {function(number[], {}, boolean): Component} makeItemComponent
     * @param {{onSwitch: (function(number[], boolean)), onAdd: (function(number[], boolean)), onDeleteGroup: (function(number[])), onDeleteItem: (function(number[], number))}} handlers
     * @returns {Component[]}
     */
    static renderItems(items, indexPath, disabled, makeItemComponent, handlers) {

        const allowDelete = items.length > 1;

        return (
            items.map( (item, itemIndex) => {
                const indexNext = indexPath.concat(itemIndex);
                if (item.condition) {
                    return (
                        <RulesGroupContainer
                            indexPath={indexNext}
                            key={itemIndex}
                            ruleItems={item.rules}
                            ruleIsAnd={item.condition == 'AND'}
                            disabled={disabled}
                            makeItemComponent={makeItemComponent}
                            handlers={handlers}
                        />
                    );
                } else {
                    return (
                        <RuleContainer
                            key={itemIndex}
                            indexPath={indexNext}
                            item={item}
                            disabled={disabled}
                            makeItemComponent={makeItemComponent}
                            onDelete={ allowDelete && ( () => handlers.onDeleteItem(indexPath, itemIndex) ) }
                        />
                    );
                }
            })
        );
    }


    render() {

        const {
            /** @type {number[]} */
            indexPath,
            /** @type {{condition: *=, field: string=, operator: string=, value: *=}[]} */
            items,
            /** @type {function(number[], {}, boolean): Component} */
            makeItemComponent,
            /** @type {boolean} */
            disabled,
            /** @type {{onSwitch: (function(number[], boolean)), onAdd: (function(number[], boolean)), onDeleteGroup: (function(number[])), onDeleteItem: (function(number[], number))}} */
            handlers
        } = this.props;

        return (
            <dd className="rules-group-body">
                <ul className="rules-list">
                    {RulesGroupBody.renderItems(items, indexPath, disabled, makeItemComponent, handlers)}
                </ul>
            </dd>
        );
    }
}



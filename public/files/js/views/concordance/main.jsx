/*
 * Copyright (c) 2016 Charles University in Prague, Faculty of Arts,
 *                    Institute of the Czech National Corpus
 * Copyright (c) 2016 Tomas Machalek <tomas.machalek@gmail.com>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; version 2
 * dated June, 1991.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import * as React from 'vendor/react';
import {init as lineSelViewsInit} from './lineSelection';
import {init as paginatorViewsInit} from './paginator';
import {init as linesViewInit} from './lines';
import {init as concDetailViewsInit} from 'views/concordance/detail';
import {init as concSaveViewsInit} from 'views/concordance/save';
import {init as ttOverviewInit} from './ttOverview';


export function init(dispatcher, he, models) {

    const layoutViews = he.getLayoutViews();

    const lineSelectionModel = models.lineSelectionModel;
    const lineModel = models.lineViewModel;
    const lconcSaveModel = lineModel.getSaveModel();
    const concDetailModel = models.concDetailModel;
    const refsDetailModel = models.refsDetailModel;
    const userInfoModel = models.userInfoModel;
    const mainMenuModel = models.mainMenuModel;
    const syntaxViewModel = lineModel.getSyntaxViewModel();
    const dashboardModel = models.dashboardModel;

    const lineSelViews = lineSelViewsInit(dispatcher, he, lineSelectionModel, userInfoModel);
    const paginationViews = paginatorViewsInit(dispatcher, he, lineModel);
    const linesViews = linesViewInit(dispatcher, he, lineModel, lineSelectionModel, concDetailModel);
    const concDetailViews = concDetailViewsInit(dispatcher, he, concDetailModel, refsDetailModel, lineModel);
    const concSaveViews = concSaveViewsInit(dispatcher, he, layoutViews, lconcSaveModel);
    const ttDistViews = ttOverviewInit(dispatcher, he, models.ttDistModel);


    // ------------------------- <LineSelectionMenu /> ---------------------------

    const LineSelectionMenu = (props) => {

        const renderContents = () => {
            if (props.numItemsInLockedGroups > 0) {
                return <lineSelViews.LockedLineGroupsMenu
                        chartCallback={props.onChartFrameReady}
                        canSendEmail={props.canSendEmail}
                        mode={props.mode} />;

            } else {
                return <lineSelViews.LineBinarySelectionMenu mode={props.mode} />;
            }
        };

        return (
            <layoutViews.PopupBox onCloseClick={props.onCloseClick}
                    customStyle={{position: 'absolute', left: '80pt', marginTop: '5pt'}}
                    takeFocus={true}>
                {renderContents()}
            </layoutViews.PopupBox>
        );
    }

    // ------------------------- <LineSelectionOps /> ---------------------------

    class LineSelectionOps extends React.Component {

        constructor(props) {
            super(props);
            this._selectChangeHandler = this._selectChangeHandler.bind(this);
            this._selectMenuTriggerHandler = this._selectMenuTriggerHandler.bind(this);
            this._closeMenuHandler = this._closeMenuHandler.bind(this);
            this._modelChangeHandler = this._modelChangeHandler.bind(this);
            this.state = {
                menuVisible: false
            };
        }

        _selectChangeHandler(event) {
            dispatcher.dispatch({
                actionType: 'CONCORDANCE_SET_LINE_SELECTION_MODE',
                props: {
                    mode: event.currentTarget.value
                }
            });
        }

        _selectMenuTriggerHandler() {
            this.setState({
                menuVisible: true
            });
        }

        _closeMenuHandler() {
            this.setState({
                menuVisible: false
            });
        }

        _modelChangeHandler() {
            this.setState({
                menuVisible: false // <- data of lines changed => no need for menu
            });
        }

        componentDidMount() {
            lineModel.addChangeListener(this._modelChangeHandler);
        }

        componentWillUnmount() {
            lineModel.removeChangeListener(this._modelChangeHandler);
        }

        _getMsgStatus() {
            if (this.props.numItemsInLockedGroups > 0) {
                return [
                    he.createStaticUrl('img/info-icon.svg'),
                    he.translate('linesel__you_have_saved_line_groups')
                ];

            } else if (this.props.numSelected > 0) {
                return [
                    he.createStaticUrl('/img/warning-icon.svg'),
                    he.translate('linesel__you_have_unsaved_line_sel')
                ];

            } else {
                return ['', null];
            }
        }

        _renderNumSelected() {
            const [statusImg, elmTitle] = this._getMsgStatus();
            const numSelected = this.props.numSelected > 0 ?
                    this.props.numSelected : this.props.numItemsInLockedGroups;
            if (numSelected > 0) {
                return (
                    <span className="lines-selection" title={elmTitle}>
                        {'\u00A0'}
                        (<a key="numItems" onClick={this._selectMenuTriggerHandler}>
                        <span className="value">{numSelected}</span>
                        {'\u00A0'}{he.translate('concview__num_sel_lines')}</a>
                        )
                        {statusImg ?
                            <img src={statusImg} alt="" title="" /> : null}
                    </span>
                );

            } else {
                return null;
            }
        }

        render() {
            const mode = this.props.numItemsInLockedGroups > 0 ? 'groups' : lineSelectionModel.getMode();
            return (
                <div className="lines-selection-controls">
                    {he.translate('concview__line_sel')}:{'\u00A0'}
                    {/* TODO remove id */}
                    <select id="selection-mode-switch"
                            disabled={this.props.numItemsInLockedGroups > 0 ? true : false}
                            onChange={this._selectChangeHandler}
                            defaultValue={mode}>
                        <option value="simple">{he.translate('concview__line_sel_simple')}</option>
                        <option value="groups">{he.translate('concview__line_sel_groups')}</option>
                    </select>
                    {this._renderNumSelected()}
                    {this.state.menuVisible ?
                        <LineSelectionMenu
                                mode={mode}
                                onCloseClick={this._closeMenuHandler}
                                numItemsInLockedGroups={this.props.numItemsInLockedGroups}
                                onChartFrameReady={this.props.onChartFrameReady}
                                canSendEmail={this.props.canSendEmail} />
                        :  null}
                </div>
            );
        }
    }


    // ------------------------- <ConcSummary /> ---------------------------

    class ConcSummary extends React.Component {

        constructor(props) {
            super(props);
            this._handleCalcIpmClick = this._handleCalcIpmClick.bind(this);
            this._modelChangeHandler = this._modelChangeHandler.bind(this);
            this.state = this._fetchModelState();
        }

        _fetchModelState() {
            return {
                canCalculateAdHocIpm: lineModel.getProvidesAdHocIpm(),
                fastAdHocIpm: lineModel.getFastAdHocIpm(),
                adHocIpm: lineModel.getAdHocIpm(),
                subCorpName: lineModel.getSubCorpName(),
                isWaiting: false
            };
        }

        _renderNumHits() {
            const ans = [];
            if (this.props.isUnfinishedCalculation) {
                ans.push(<span key="hits:1" id="conc-loader">
                            <img src={he.createStaticUrl('img/ajax-loader-bar.gif')} title={he.translate('global__processing')}
                                alt={he.translate('global__processing')} />
                        </span>);
            }
            if (this.props.concSize === this.props.fullSize || this.props.fullSize === -1) { // TODO concSize vs. fullSize
                ans.push(<strong key="hits:2" id="fullsize" title={this.props.concSize}>
                        {he.formatNumber(this.props.concSize)}</strong>);

            } else {
                ans.push(<a key="hits:1b" className="size-warning"><img src={he.createStaticUrl('img/warning-icon.svg')} /></a>);
                ans.push(<span key="hits:2b" id="loader"></span>);
                ans.push(<strong key="hits:3b">{he.formatNumber(this.props.concSize)}</strong>);
                ans.push('\u00a0' + he.translate('concview__out_of_total') + '\u00a0');
                ans.push(<span key="hits:4b" id="fullsize" title={this.props.fullSize}>{he.formatNumber(this.props.fullSize)}</span>);
            }
            return ans;
        }

        _modelChangeHandler(model, action) {
            const newState = this._fetchModelState();
            // TODO antipattern here:
            newState.isWaiting = action === '$CONCORDANCE_CALCULATE_IPM_FOR_AD_HOC_SUBC' ? false : this.state.isWaiting;
            this.setState(newState);
        }

        componentDidMount() {
            lineModel.addChangeListener(this._modelChangeHandler);
        }

        componentWillUnmount() {
            lineModel.removeChangeListener(this._modelChangeHandler);
        }

        _getIpm() {
            if (this.state.isWaiting) {
                return <img src={he.createStaticUrl('img/ajax-loader-bar.gif')}
                            alt={he.translate('global__calculating')}
                            title={he.translate('global__calculating')} />;

            } else if (typeof this.props.ipm === 'number' && !this.state.canCalculateAdHocIpm) {
                return <span className="ipm">{he.formatNumber(this.props.ipm)}</span>;

            } else if (this.state.adHocIpm) {
                return <span className="ipm">{he.formatNumber(this.state.adHocIpm)}</span>;

            } else if (this.state.canCalculateAdHocIpm) {
                return <a onClick={this._handleCalcIpmClick}>{he.translate('global__calculate')}</a>;

            } else {
                return null;
            }
        }

        _getIpmDesc() {
            if (this.state.canCalculateAdHocIpm) {
                if (this.state.adHocIpm) {
                    return (
                        <span className="ipm-note">(
                        <img src={he.createStaticUrl('img/info-icon.svg')} alt={he.translate('global__info_icon')} />
                                {he.translate('concview__ipm_rel_to_adhoc')}
                        )</span>
                    );

                } else {
                    return null;
                }

            } else if (this.state.subCorpName) {
                return (
                    <span className="ipm-note">(
                        <img src={he.createStaticUrl('img/info-icon.svg')} alt={he.translate('global__info_icon')} />
                        {he.translate('concview__ipm_rel_to_the_{subcname}',
                        {subcname: this.state.subCorpName})}
                    )</span>
                );

            } else {
                return (
                    <span className="ipm-note">(
                        <img src={he.createStaticUrl('img/warning-icon.svg')} alt={he.translate('global__warning_icon')} />
                        {he.translate('concview__ipm_rel_to_the_{corpname}',
                            {corpname: this.props.corpname})}
                    )</span>
                );
            }
        }

        _handleCalcIpmClick() {
            const userConfirm = this.state.fastAdHocIpm ?
                    true : window.confirm(he.translate('global__ipm_calc_may_take_time'));
            if (userConfirm) {
                const newState = he.cloneState(this.state);
                newState.isWaiting = true;
                this.setState(newState);
                dispatcher.dispatch({
                    actionType: 'CONCORDANCE_CALCULATE_IPM_FOR_AD_HOC_SUBC',
                    props: {}
                });
            }
        }

        _getArf() {
            if (this.props.arf) {
                return <strong id="arf">{he.formatNumber(this.props.arf)}</strong>;

            } else {
                return <strong id="arf" title={he.translate('concview__arf_not_avail')}>-</strong>;
            }
        }

        render() {
            return (
                <div id="result-info">
                    {he.translate('concview__hits_label')}:  {this._renderNumHits()}
                    <span id="conc-calc-info" title="90"></span>
                    <span className="separ">|</span>
                    <abbr>{he.translate('global__abbr_ipm')}</abbr>
                    <layoutViews.InlineHelp customStyle={{minWidth: '25em'}}
                            url={he.getHelpLink('term_ipm')}>
                        {he.translate('concview__ipm_help')}
                    </layoutViews.InlineHelp>
                    :{'\u00A0'}
                    {this._getIpm()}
                    {'\u00A0'}
                    {this._getIpmDesc()}
                    {'\u00A0'}
                    <span className="separ">|</span>
                    <abbr>{he.translate('global__abbr_arf')}</abbr>
                    <layoutViews.InlineHelp customStyle={{minWidth: '20em'}}
                            url={he.getHelpLink('term_arf')}>
                        {he.translate('concview__arf_help')}
                    </layoutViews.InlineHelp>
                    :{'\u00A0'}
                    {this._getArf()}
                    <span className="separ">|</span>
                    <span className="notice-shuffled">
                    {this.props.isShuffled ?
                        he.translate('concview__result_shuffled') :
                        he.translate('concview__result_sorted')}
                    </span>
                </div>
            );
        }
    }

    // ------------------------- <ConcOptions /> ---------------------------

    class ConcOptions extends React.Component {

        constructor(props) {
            super(props);
            this._modelChangeHandler = this._modelChangeHandler.bind(this);
            this.state = {
                currViewAttrs: lineModel.getViewAttrs()
            };
        }

        _modelChangeHandler() {
            this.setState({currViewAttrs: lineModel.getViewAttrs()});
        }

        componentDidMount() {
            lineModel.addChangeListener(this._modelChangeHandler);
        }

        componentWillUnmount() {
            lineModel.removeChangeListener(this._modelChangeHandler);
        }

        _renderMouseOverInfo() {
            let mouseoverImg;
            let mouseoverAlt;
            if (this.props.viewMode === 'mouseover') {
                mouseoverImg = he.createStaticUrl('img/mouseover-available.svg');
                mouseoverAlt = he.translate('options__attribs_are_on_mouseover_{attrs}',
                        {attrs: this.state.currViewAttrs.slice(1).join('/')});

            } else if (this.props.viewMode === 'mixed') {
                mouseoverImg = he.createStaticUrl('img/mouseover-mixed.svg');
                mouseoverAlt = he.translate('options__attribs_are_mixed_{attrs}',
                        {attrs: this.state.currViewAttrs.slice(1).join('/')});

            } else {
                mouseoverImg = he.createStaticUrl('img/mouseover-not-available.svg');
                mouseoverAlt = he.translate('options__attribs_are_not_mouseover');
            }
            return (
                <span>
                    {he.translate('options__vmode_status_label')}
                    {':\u00a0'}
                    <img key="bubb" className="mouseover-available"
                            src={mouseoverImg} alt={mouseoverAlt} title={mouseoverAlt} />
                </span>
            );
        }

        render() {
            return (
                <div className="conc-toolbar">
                    <span className="separ">|</span>
                    {this._renderMouseOverInfo()}
                </div>
            );
        }
    }


    // ------------------------- <ConcToolbarWrapper /> ---------------------------


    class ConcToolbarWrapper extends React.Component {

        constructor(props) {
            super(props);
            this._modelChangeHandler = this._modelChangeHandler.bind(this);
            this.state = this._fetchModelState();
        }

        _fetchModelState() {
            return {
                numSelected: lineSelectionModel.size(),
                numItemsInLockedGroups: lineModel.getNumItemsInLockedGroups()
            };
        }

        _modelChangeHandler() {
            this.setState(this._fetchModelState());
        }

        componentDidMount() {
            lineSelectionModel.addChangeListener(this._modelChangeHandler);
        }

        componentWillUnmount() {
            lineSelectionModel.removeChangeListener(this._modelChangeHandler);
        }

        render() {
            return (
                <div className="toolbar-level">
                    <LineSelectionOps
                            numSelected={this.state.numSelected}
                            numItemsInLockedGroups={this.state.numItemsInLockedGroups}
                            onChartFrameReady={this.props.onChartFrameReady}
                            canSendEmail={this.props.canSendEmail} />
                    {this.props.showConcToolbar ?
                        <ConcOptions viewMode={this.props.viewMode} />
                        : null}
                </div>
            );
        }
    }


    // ------------------------- <AnonymousUserLoginPopup /> ---------------------------

    const AnonymousUserLoginPopup = (props) => {

        const handleLoginClick = (evt) => {
            dispatcher.dispatch({
                actionType: 'USER_SHOW_LOGIN_DIALOG',
                props: {
                    returnUrl: window.location.href
                }
            });
            evt.preventDefault();
        };

        return (
            <layoutViews.PopupBox onCloseClick={props.onCloseClick} takeFocus={true}
                customStyle={{left: '50%', width: '30em', marginLeft: '-15em'}}>
                <p>
                    <img className="info-icon" src={he.createStaticUrl('img/warning-icon.svg')} alt={he.translate('global__info_icon')} />
                    {he.translate('global__anonymous_user_warning')}
                </p>
                <p>
                    <button type="button" className="default-button"
                            ref={elm => elm ? elm.focus() : null}
                            onClick={handleLoginClick}>
                        {he.translate('global__login_label')}
                    </button>
                </p>
            </layoutViews.PopupBox>
        );
    };

    // ------------------------- <SyntaxViewPane /> ----------------------------

    class SyntaxViewPane extends React.Component {

        constructor(props) {
            super(props);
            this.state = {
                waiting: syntaxViewModel.isWaiting()
            };
            this._handleModelChange = this._handleModelChange.bind(this);
        }

        _handleModelChange() {
            this.setState({
                waiting: syntaxViewModel.isWaiting()
            });
        }

        componentDidMount() {
            syntaxViewModel.addChangeListener(this._handleModelChange);
            this.props.onReady(
                this.props.tokenNumber,
                this.props.kwicLength
            );
        }

        componentWillUnmount() {
            this.props.onClose();
            syntaxViewModel.removeChangeListener(this._handleModelChange);
        }

        render() {
            return (
                <layoutViews.ModalOverlay onCloseKey={this.props.onCloseClick} isScrollable={true}>
                    <layoutViews.PopupBox onCloseClick={this.props.onCloseClick}
                            customClass="syntax-tree">
                        <div id="syntax-view-pane" className="SyntaxViewPane">
                            {this.state.waiting ?
                                (<div className="ajax-loader">
                                    <img src={he.createStaticUrl('img/ajax-loader.gif')}
                                            alt={he.translate('global__loading')} />
                                </div>) : null
                            }
                        </div>
                    </layoutViews.PopupBox>
                </layoutViews.ModalOverlay>
            );
        }
    };


    // ------------------------- <ConcordanceView /> ---------------------------

    class ConcordanceView extends React.Component {

        constructor(props) {
            super(props);
            this.state = this._fetchModelState();
            this._handleModelChange = this._handleModelChange.bind(this);
            this._handleDetailCloseClick = this._handleDetailCloseClick.bind(this);
            this._refsDetailClickHandler = this._refsDetailClickHandler.bind(this);
            this._handleAnonymousUserWarning = this._handleAnonymousUserWarning.bind(this);
            this._handleSyntaxBoxClick = this._handleSyntaxBoxClick.bind(this);
            this._handleSyntaxBoxClose = this._handleSyntaxBoxClose.bind(this);
            this._detailClickHandler = this._detailClickHandler.bind(this);
        }

        _fetchModelState() {
            return {
                hasConcDetailData: concDetailModel.hasConcDetailData(),
                tokenDetailData: concDetailModel.getTokenDetailData(),
                tokenDetailIsBusy: concDetailModel.getTokenDetailIsBusy(),
                concDetailModelIsBusy: concDetailModel.getIsBusy(),
                refsDetailData: refsDetailModel.getData(),
                viewMode: lineModel.getViewAttrsVmode(),
                isUnfinishedCalculation: lineModel.isUnfinishedCalculation(),
                concSummary: lineModel.getConcSummary(),
                showAnonymousUserWarn: this.props.anonymousUser,
                saveFormVisible: lconcSaveModel.getFormIsActive(),
                supportsSyntaxView: lineModel.getSupportsSyntaxView(),
                syntaxBoxData: null
            };
        }

        _handleModelChange() {
            const state = this._fetchModelState();
            state.showAnonymousUserWarn = this.state.showAnonymousUserWarn;
            this.setState(state);
        }

        _handleDetailCloseClick() {
            dispatcher.dispatch({
                actionType: 'CONCORDANCE_STOP_SPEECH',
                props: {}
            });
            dispatcher.dispatch({
                actionType: 'CONCORDANCE_RESET_DETAIL',
                props: {}
            });
        }

        _detailClickHandler(corpusId, tokenNumber, kwicLength, lineIdx) {
            if (concDetailModel.getViewMode() === 'default') {
                if (kwicLength > 0) {
                    dispatcher.dispatch({
                        actionType: 'CONCORDANCE_SHOW_KWIC_DETAIL',
                        props: {
                            corpusId: corpusId,
                            tokenNumber: tokenNumber,
                            kwicLength: kwicLength,
                            lineIdx: lineIdx
                        }
                    });

                } else if (kwicLength === -1) {
                    dispatcher.dispatch({
                        actionType: 'CONCORDANCE_SHOW_TOKEN_DETAIL',
                        props: {
                            corpusId: corpusId,
                            tokenNumber: tokenNumber,
                            lineIdx: lineIdx
                        }
                    });
                }

            } else if (concDetailModel.getViewMode() === 'speech') {
                dispatcher.dispatch({
                    actionType: 'CONCORDANCE_SHOW_SPEECH_DETAIL',
                    props: {
                        corpusId: corpusId,
                        tokenNumber: tokenNumber,
                        kwicLength: kwicLength,
                        lineIdx: lineIdx
                    }
                });
            }
        }

        _refsDetailClickHandler(corpusId, tokenNumber, lineIdx) {
            dispatcher.dispatch({
                actionType: 'CONCORDANCE_SHOW_REF_DETAIL',
                props: {
                    corpusId: corpusId,
                    tokenNumber: tokenNumber,
                    lineIdx: lineIdx
                }
            });
        }

        _handleAnonymousUserWarning() {
            const state = this._fetchModelState();
            state.showAnonymousUserWarn = false;
            this.setState(state);
        }

        _handleRefsDetailCloseClick() {
            dispatcher.dispatch({
                actionType: 'CONCORDANCE_REF_RESET_DETAIL',
                props: {}
            });
        }

        _handleSyntaxBoxClick(tokenNumber, kwicLength) {
            const newState = he.cloneState(this.state);
            newState.syntaxBoxData = {tokenNumber: tokenNumber, kwicLength: kwicLength};
            this.setState(newState);
        }

        _handleSyntaxBoxClose() {
            const newState = he.cloneState(this.state);
            newState.syntaxBoxData = null;
            this.setState(newState);
        }

        componentDidMount() {
            lineModel.addChangeListener(this._handleModelChange);
            lconcSaveModel.addChangeListener(this._handleModelChange);
            concDetailModel.addChangeListener(this._handleModelChange);
            refsDetailModel.addChangeListener(this._handleModelChange);
        }

        componentWillUnmount() {
            lineModel.removeChangeListener(this._handleModelChange);
            lconcSaveModel.removeChangeListener(this._handleModelChange);
            concDetailModel.removeChangeListener(this._handleModelChange);
            refsDetailModel.removeChangeListener(this._handleModelChange);
        }

        _shouldDisplayConcDetailBox() {
            return this.state.hasConcDetailData || this.state.tokenDetailData.length > 0 ||
                    this.state.concDetailModelIsBusy || this.state.tokenDetailIsBusy;
        }

        render() {
            return (
                <div className="ConcordanceView">
                    {this.state.syntaxBoxData ?
                        <SyntaxViewPane onCloseClick={this._handleSyntaxBoxClose}
                                tokenNumber={this.state.syntaxBoxData.tokenNumber}
                                kwicLength={this.state.syntaxBoxData.kwicLength}
                                onReady={this.props.onSyntaxPaneReady}
                                onClose={this.props.onSyntaxPaneClose} /> : null}
                    {this._shouldDisplayConcDetailBox() ?
                        <concDetailViews.TokenDetail closeClickHandler={this._handleDetailCloseClick} />
                        : null
                    }
                    {this.state.refsDetailData ?
                        <concDetailViews.RefDetail
                            closeClickHandler={this._handleRefsDetailCloseClick}
                            corpusId={this.state.refsDetailData.corpusId}
                            tokenNumber={this.state.refsDetailData.tokenNumber}
                            lineIdx={this.state.refsDetailData.lineIdx} />
                        : null
                    }
                    <div id="conc-top-bar">
                        <div className="info-level">
                            <paginationViews.Paginator {...this.props} />
                            <ConcSummary {...this.state.concSummary}
                                corpname={this.props.baseCorpname}
                                isUnfinishedCalculation={this.state.isUnfinishedCalculation}
                                />
                        </div>
                        <ConcToolbarWrapper numItemsInLockedGroups={this.props.NumItemsInLockedGroups}
                                onChartFrameReady={this.props.onChartFrameReady}
                                canSendEmail={this.props.canSendEmail}
                                showConcToolbar={this.props.ShowConcToolbar}
                                viewMode={this.state.viewMode} />
                        {this.state.showAnonymousUserWarn ?
                            <AnonymousUserLoginPopup onCloseClick={this._handleAnonymousUserWarning} /> : null}
                    </div>
                    <div id="conclines-wrapper">
                        <linesViews.ConcLines {...this.props}
                            supportsSyntaxView={this.state.supportsSyntaxView}
                            onSyntaxViewClick={this._handleSyntaxBoxClick}
                            tokenDetailClickHandler={this._detailClickHandler}
                            refsDetailClickHandler={this._refsDetailClickHandler} />
                    </div>
                    <div id="conc-bottom-bar">
                        <div className="info-level">
                            <paginationViews.Paginator {...this.props} />
                        </div>
                    </div>
                    {this.state.saveFormVisible ? <concSaveViews.ConcSaveForm /> : null}
                </div>
            );
        }
    }


    // ------------------------- <ConcordanceDashboard /> ---------------------------

    class ConcordanceDashboard extends React.Component {

        constructor(props) {
            super(props);
            this.state = this._fetchModelState();
            this._modelChangeListener = this._modelChangeListener.bind(this);
        }

        _modelChangeListener() {
            this.setState(this._fetchModelState());
        }

        _fetchModelState() {
            return {
                showTTOverview: dashboardModel.getShowTTOverview()
            };
        }

        componentDidMount() {
            dashboardModel.addChangeListener(this._modelChangeListener);
        }

        componentWillUnmount() {
            dashboardModel.removeChangeListener(this._modelChangeListener);
        }

        render() {
            return (
                <div>
                    {this.state.showTTOverview ? <ttDistViews.TextTypesDist /> : null}
                    <ConcordanceView {...this.props.concViewProps} />
                </div>
            );
        }
    };


    return {
        ConcordanceDashboard: ConcordanceDashboard
    };

}
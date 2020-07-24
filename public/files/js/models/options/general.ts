/*
 * Copyright (c) 2017 Charles University in Prague, Faculty of Arts,
 *                    Institute of the Czech National Corpus
 * Copyright (c) 2017 Tomas Machalek <tomas.machalek@gmail.com>
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

import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { IFullActionControl, StatelessModel } from 'kombo';
import { HTTP, List } from 'cnc-tskit';

import { Kontext } from '../../types/common';
import { validateGzNumber } from '../base';
import { PageModel } from '../../app/page';
import { MultiDict } from '../../multidict';
import { Actions as MainMenuActions, ActionName as MainMenuActionName } from '../mainMenu/actions';
import { Actions, ActionName } from './actions';
import { ViewOptsResponse } from './common';


export interface GeneralViewOptionsModelState {

    pageSize:Kontext.FormValue<string>;

    newCtxSize:Kontext.FormValue<string>;

    wlpagesize:Kontext.FormValue<string>;

    fmaxitems:Kontext.FormValue<string>;

    citemsperpage:Kontext.FormValue<string>;

    ctxUnit:string;

    lineNumbers:boolean;

    shuffle:boolean;

    useCQLEditor:boolean;

    isBusy:boolean;

    userIsAnonymous:boolean;
}


export class GeneralViewOptionsModel extends StatelessModel<GeneralViewOptionsModelState> {

    private static readonly MAX_ITEMS_PER_PAGE = 500;

    private static readonly MAX_CTX_SIZE = 100;

    private readonly layoutModel:PageModel;

    private readonly submitResponseHandlers:Array<(store:GeneralViewOptionsModel)=>void>;

    constructor(dispatcher:IFullActionControl, layoutModel:PageModel, userIsAnonymous:boolean) {
        super(
            dispatcher,
            {
                userIsAnonymous,
                pageSize: Kontext.newFormValue('0', true),
                newCtxSize: Kontext.newFormValue('0', true),
                ctxUnit: '',
                lineNumbers: false,
                shuffle: false,
                useCQLEditor: false,
                wlpagesize: Kontext.newFormValue('0', true),
                fmaxitems: Kontext.newFormValue('0', true),
                citemsperpage: Kontext.newFormValue('0', true),
                isBusy: false
            }
        );
        this.layoutModel = layoutModel;
        this.submitResponseHandlers = [];

        this.addActionHandler<MainMenuActions.ShowGeneralViewOptions>(
            MainMenuActionName.ShowGeneralViewOptions,
            (state, action) => {
                state.isBusy = true;
            },
            (state, action, dispatch) => {
                this.loadData().subscribe(
                    (data) => {
                        dispatch<Actions.GeneralInitalDataLoaded>({
                            name: ActionName.GeneralInitalDataLoaded,
                            payload: {
                                data: data
                            }
                        });
                    },
                    (err) => {
                        this.layoutModel.showMessage('error', err);
                        dispatch<Actions.GeneralInitalDataLoaded>({
                            name: ActionName.GeneralInitalDataLoaded,
                            error: err
                        });
                    }
                );
            }
        );

        this.addActionHandler<Actions.GeneralInitalDataLoaded>(
            ActionName.GeneralInitalDataLoaded,
            (state, action) => {
                state.isBusy = false;
                if (!action.error) {
                    state.pageSize = {value: `${action.payload.data.pagesize}`, isInvalid: false, isRequired: true};
                    state.newCtxSize = {value: `${action.payload.data.newctxsize}`, isInvalid: false, isRequired: true};
                    state.ctxUnit = action.payload.data.ctxunit;
                    state.lineNumbers = !!action.payload.data.line_numbers;
                    state.shuffle = !!action.payload.data.shuffle;
                    state.wlpagesize = {value: `${action.payload.data.wlpagesize}`, isInvalid: false, isRequired: true};
                    state.fmaxitems = {value: `${action.payload.data.fmaxitems}`, isInvalid: false, isRequired: true};
                    state.citemsperpage = {value: `${action.payload.data.citemsperpage}`, isInvalid: false, isRequired: true};
                    state.useCQLEditor = !!action.payload.data.cql_editor;
                }
            }
        );

        this.addActionHandler<Actions.GeneralSetPageSize>(
            ActionName.GeneralSetPageSize,
            (state, action) => {
                state.pageSize.value = action.payload.value;
            }
        );

        this.addActionHandler<Actions.GeneralSetContextSize>(
            ActionName.GeneralSetContextSize,
            (state, action) => {
                state.newCtxSize.value = action.payload.value;
            }
        );

        this.addActionHandler<Actions.GeneralSetLineNums>(
            ActionName.GeneralSetLineNums,
            (state, action) => {
                state.lineNumbers = action.payload.value;
            }
        );

        this.addActionHandler<Actions.GeneralSetShuffle>(
            ActionName.GeneralSetShuffle,
            (state, action) => {
                state.shuffle = action.payload.value;
            }
        );

        this.addActionHandler<Actions.GeneralSetUseCQLEditor>(
            ActionName.GeneralSetUseCQLEditor,
            (state, action) => {
                state.useCQLEditor = action.payload.value;
            }
        );

        this.addActionHandler<Actions.GeneralSetWlPageSize>(
            ActionName.GeneralSetWlPageSize,
            (state, action) => {
                state.wlpagesize.value = action.payload.value;
            }
        );

        this.addActionHandler<Actions.GeneralSetFmaxItems>(
            ActionName.GeneralSetFmaxItems,
            (state, action) => {
                state.fmaxitems.value = action.payload.value;
            }
        );

        this.addActionHandler<Actions.GeneralSetCitemsPerPage>(
            ActionName.GeneralSetCitemsPerPage,
            (state, action) => {
                state.citemsperpage.value = action.payload.value;
            }
        );

        this.addActionHandler<Actions.GeneralSubmit>(
            ActionName.GeneralSubmit,
            (state, action) => {
                state.isBusy = true;
                this.validateForm(state);
            },
            (state, action, dispatch) => {
                if (this.hasErrorInputs(state)) {
                    const err = new Error(this.layoutModel.translate('global__the_form_contains_errors_msg'));
                    this.layoutModel.showMessage('error', err);
                    dispatch<Actions.GeneralSubmitDone>({
                        name: ActionName.GeneralSubmitDone,
                        error: err
                    });

                } else {
                    this.submit(state).subscribe(
                        () => {
                            dispatch<Actions.GeneralSubmitDone>({
                                name: ActionName.GeneralSubmitDone,
                                payload: {
                                    showLineNumbers: state.lineNumbers,
                                    pageSize: parseInt(state.pageSize.value),
                                    newCtxSize: parseInt(state.newCtxSize.value),
                                    wlpagesize: parseInt(state.wlpagesize.value),
                                    fmaxitems: parseInt(state.fmaxitems.value),
                                    citemsperpage: parseInt(state.citemsperpage.value)
                                }
                            });
                            List.forEach(fn => fn(this), this.submitResponseHandlers);
                        },
                        (err) => {
                            this.layoutModel.showMessage('error', err);
                            dispatch<Actions.GeneralSubmitDone>({
                                name: ActionName.GeneralSubmitDone,
                                error: err
                            });
                        }
                    );
                }
            }
        );

        this.addActionHandler<Actions.GeneralSubmitDone>(
            ActionName.GeneralSubmitDone,
            (state, action) => {
                state.isBusy = false;
            }
        );
    }

    private testMaxPageSize(v:string):boolean {
        return parseInt(v) <= GeneralViewOptionsModel.MAX_ITEMS_PER_PAGE;
    }

    private testMaxCtxSize(v:string):boolean {
        return parseInt(v) <= GeneralViewOptionsModel.MAX_CTX_SIZE;
    }

    private hasErrorInputs(state:GeneralViewOptionsModelState):boolean {
        return List.some(
            x => x.isInvalid,
            [state.pageSize, state.newCtxSize, state.wlpagesize, state.citemsperpage, state.newCtxSize]
        );
    }

    private validateForm(state:GeneralViewOptionsModelState):void {
        List.forEach(
            val => {
                if (Kontext.isFormValue(val)) {
                    if (!validateGzNumber(val.value)) {
                        val.isInvalid = true;
                        val.errorDesc = this.layoutModel.translate('global__invalid_number_format');

                    } else if (!this.testMaxPageSize(val.value)) {
                        val.isInvalid = true;
                        val.errorDesc = this.layoutModel.translate('options__max_items_per_page_exceeded_{num}',
                                            {num: GeneralViewOptionsModel.MAX_ITEMS_PER_PAGE});

                    } else {
                        val.isInvalid = false;
                        val.errorDesc = undefined;
                    }
                }
            },
            [state.pageSize, state.newCtxSize, state.wlpagesize, state.citemsperpage]
        );

        if (!this.testMaxCtxSize(state.newCtxSize.value)) {
            state.newCtxSize.isInvalid = true;
            state.newCtxSize.errorDesc = this.layoutModel.translate('options__max_context_exceeded_{num}',
                    {num: GeneralViewOptionsModel.MAX_CTX_SIZE});

        } else {
            state.newCtxSize.isInvalid = false;
            state.newCtxSize.errorDesc = undefined;
        }
    }

    addOnSubmitResponseHandler(fn:(model:GeneralViewOptionsModel)=>void):void {
        this.submitResponseHandlers.push(fn);
    }

    loadData():Observable<ViewOptsResponse> {
        return this.layoutModel.ajax$<ViewOptsResponse>(
            HTTP.Method.GET,
            this.layoutModel.createActionUrl('options/viewopts'),
            {}
        );
    }

    private submit(state:GeneralViewOptionsModelState):Observable<Kontext.AjaxResponse> {
        const args = new MultiDict();
        args.set('pagesize', state.pageSize.value);
        args.set('newctxsize', state.newCtxSize.value);
        args.set('ctxunit', state.ctxUnit);
        args.set('line_numbers', state.lineNumbers ? '1' : '0');
        args.set('shuffle', state.shuffle ? '1' : '0');
        args.set('wlpagesize', state.wlpagesize.value);
        args.set('fmaxitems', state.fmaxitems.value);
        args.set('citemsperpage', state.citemsperpage.value);
        args.set('cql_editor', state.useCQLEditor ? '1' : '0');
        return this.layoutModel.ajax$<Kontext.AjaxResponse>(
            HTTP.Method.POST,
            this.layoutModel.createActionUrl('options/viewoptsx'),
            args

        ).pipe(
            tap(d => {
                this.layoutModel.replaceConcArg('pagesize', [state.pageSize.value]);
            })
        );
    }
}

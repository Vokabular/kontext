/*
 * Copyright (c) 2013 Institute of the Czech National Corpus
 * Copyright (c) 2003-2009  Pavel Rychly
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

/**
 * This module contains functionality related directly to the first_form.tmpl template
 *
 */
define(['win', 'jquery', 'corplist', 'tpl/document', 'queryInput', 'plugins/queryStorage',
    'plugins/liveAttributes', 'conclines'], function (win, $, corplistComponent, layoutModule, queryInput, queryStorage,
                                                      liveAttributes, conclines) {
    'use strict';

    var lib = {},
        activeParallelCorporaSettingKey = 'active_parallel_corpora',
        clStorage = conclines.openStorage();

    lib.maxEncodedParamsLength = 1500;
    lib.corplistComponent = null;
    lib.starComponent = null;
    lib.extendedApi = null;
    lib.layoutModel = null;

    /**
     *
     * @param {function} callback
     * @return returns what callback returns
     */
    function callOnParallelCorporaList(callback) {
        var itemList;

        if (lib.layoutModel.conf.alignedCorpora) {
            itemList = lib.layoutModel.conf.alignedCorpora;
            lib.layoutModel.userSettings.set(activeParallelCorporaSettingKey, itemList.join(','));

        } else {
            itemList = lib.layoutModel.userSettings.get(activeParallelCorporaSettingKey) || [];
        }

        if (typeof itemList !== 'object') {
            itemList = itemList.split(',');
        }
        return callback(itemList);
    }

    /**
     *
     */
    function getActiveParallelCorpora() {
        return callOnParallelCorporaList(function (itemList) {
            return itemList;
        });
    }

    /**
     * @param {string} corpusName
     */
    function addActiveParallelCorpus(corpusName) {
        callOnParallelCorporaList(function (itemList) {
            if (corpusName && $.inArray(corpusName, itemList) === -1) {
                itemList.push(corpusName);
            }
           lib.layoutModel.userSettings.set(activeParallelCorporaSettingKey, itemList.join(','));
            if ($('div.parallel-corp-lang:visible').length > 0) {
                $('#default-view-mode').remove();
                $('#mainform').append('<input id="default-view-mode" type="hidden" name="viewmode" value="align" />');
            }
        });
    }

    /**
     * @param {string} corpusName
     */
    function removeActiveParallelCorpus(corpusName) {
        callOnParallelCorporaList(function (itemList) {
            if ($.inArray(corpusName, itemList) >= 0) {
                itemList.splice($.inArray(corpusName, itemList), 1);
            }
           lib.layoutModel.userSettings.set(activeParallelCorporaSettingKey, itemList.join(','));
            if ($('div.parallel-corp-lang:visible').length === 0) {
                $('#default-view-mode').remove();
            }
        });
    }

    /**
     * Creates function (i.e. you must call it first to be able to use it)
     * to handle the "add language" action.
     *
     * @param {string} [forcedCorpusId] optional parameter to force corpus to be added (otherwise
     * it is chosen based on "#add-searched-lang-widget select" select box value). It is useful
     * in case you want to call the handler manually.
     * @return {function} handler function
     */
    function createAddLanguageClickHandler(forcedCorpusId) {
        return function () {
            var corpusId,
                jqHiddenStatus,
                jqNewLangNode;

            corpusId = forcedCorpusId || $('#add-searched-lang-widget select').val();

            if (corpusId) {
                jqHiddenStatus = $('[id="qnode_' + corpusId + '"] input[name="sel_aligned"]');

                jqNewLangNode = $('[id="qnode_' + corpusId + '"]');

                if (jqNewLangNode.length > 0) {
                    jqNewLangNode.show();
                    addActiveParallelCorpus(corpusId);
                    $('#add-searched-lang-widget select option[value="' + corpusId + '"]').attr('disabled', true);


                    jqHiddenStatus.val(jqHiddenStatus.data('corpus'));
                    jqNewLangNode.find('a.close-button').on('click', function () {
                        $('[id="qnode_' + corpusId + '"]').hide();
                        jqHiddenStatus.val('');
                        removeActiveParallelCorpus(corpusId);
                        $('#add-searched-lang-widget select option[value="' + corpusId + '"]').removeAttr('disabled');
                       lib.layoutModel.resetPlugins();
                    });

                    queryInput.initVirtualKeyboard(jqNewLangNode.find('table.form tr:visible td > .spec-chars').get(0));

                    if (!$.support.cssFloat) {
                        // refresh content in IE < 9
                        $('#content').css('overflow', 'visible').css('overflow', 'auto');
                    }
                }
               lib.layoutModel.resetPlugins();
            }
        };
    }

    /**
     * @todo rename/refactor this stuff
     */
    lib.misc = function () {
        lib.corplistComponent = corplistComponent.create(
            $('form[action="first"] select[name="corpname"]'),
           lib.layoutModel.pluginApi(),
            {formTarget: 'first_form'}
        );

        lib.starComponent = corplistComponent.createStarComponent(lib.corplistComponent,lib.layoutModel.pluginApi());

        // initial query selector setting (just like when user changes it manually)
        queryInput.cmdSwitchQuery(lib.layoutModel, $('#queryselector').get(0), lib.layoutModel.conf.queryTypesHints);

        // open currently used languages for parallel corpora
        $.each(getActiveParallelCorpora(), function (i, item) {
            createAddLanguageClickHandler(item)();
        });
    };

    /**
     * Updates toggleable fieldsets to the state user set
     * last time he used the form.
     *
     * @returns {$.Deferred.Promise} a promise object
     */
    lib.updateToggleableFieldsets = function () {
        var jqLink = $('a.form-extension-switch'),
            jqFieldset,
            elmStatus,
            defer = $.Deferred(); // currently, this is synchronous

        jqLink.each(function () {
            jqFieldset = $(this).closest('fieldset');
            elmStatus = lib.layoutModel.userSettings.get($(this).data('box-id'));

            if (elmStatus === true) {
                jqFieldset.removeClass('inactive');
                jqFieldset.find('div.contents').show();
                jqFieldset.find('div.desc').hide();
                jqFieldset.find('.status').attr('src', '../files/img/collapse.png')
                    .attr('data-alt-img', '../files/img/collapse_s.png')
                    .attr('alt', lib.layoutModel.conf.messages.click_to_hide);
                jqLink.attr('title', lib.layoutModel.conf.messages.click_to_hide);

            } else {
                jqFieldset.find('div.contents').hide();
                jqFieldset.find('div.desc').show();
                jqFieldset.find('.status').attr('src', '../files/img/expand.png')
                    .attr('data-alt-img', '../files/img/expand_s.png')
                    .attr('alt', lib.layoutModel.conf.messages.click_to_expand);
                jqLink.attr('title', lib.layoutModel.conf.messages.click_to_expand);
            }
        });
        lib.layoutModel.mouseOverImages();
        defer.resolve();
        return defer.promise();
    };

    lib.bindStaticElements = function () {
        // context-switch TODO

        $('#switch_err_stand').on('click', function () {
            if ($(this).text() === lib.layoutModel.conf.labelStdQuery) {
                $('#qnode').show();
                $('#cup_err_menu').hide();
                $(this).text(lib.layoutModel.conf.labelErrorQuery);
                lib.layoutModel.userSettings.set("errstdq", "std");

            } else {
                $('#qnode').hide();
                $('#cup_err_menu').show();
                $(this).text(lib.layoutModel.conf.labelStdQuery);
                lib.layoutModel.userSettings.set("errstdq", "err");
            }
        });
    };

    /**
     *
     */
    lib.bindParallelCorporaCheckBoxes = function () {

        $('#add-searched-lang-widget button[type="button"]').each(function () {
            $(this).on('click', createAddLanguageClickHandler());
        });
        $('input[name="sel_aligned"]').each(function () {
            if ($(this).val()) {
                $('select[name="pcq_pos_neg_' + $(this).data('corpus') + '"],[id="qtable_' + $(this).data('corpus') + '"]').show();
            }
        });
    };

    /**
     *
     */
    lib.showCupMenu = function () {
        if (lib.layoutModel.userSettings.get('errstdq') === 'std') {
            $('#cup_err_menu').hide();
            $('#switch_err_stand').text(lib.layoutModel.conf.messages.labelErrorQuery);

        } else {
            $('#qnode').hide();
        }
    };

    lib.makePrimaryButtons = function () {
        var queryForm = $('#mainform');

        queryForm.find('.make-primary').on('click', function (evt) {
            var linkElm = evt.currentTarget,
                jqCurrPrimaryCorpInput = queryForm.find('input[type="hidden"][name="corpname"]'),
                newPrimary = $(linkElm).attr('data-corpus-id');

            queryForm.attr('action', 'first_form?' + lib.layoutModel.conf.stateParams);
            removeActiveParallelCorpus(newPrimary);
            addActiveParallelCorpus(jqCurrPrimaryCorpInput.attr('value'));
            $('#mainform input[type="hidden"][name="corpname"]').val(newPrimary);
            $('#mainform input[type="hidden"][name="reload"]').val(1);
            $('#make-concordance-button').click();
        });
    };

    /**
     *
     * @param {object} conf
     * @return {{}} a simple object containing promises returned
     * by some of
     */
    lib.init = function (conf) {
        var promises;

        clStorage.clear();

        lib.layoutModel = new layoutModule.PageModel(conf);
        lib.extendedApi = queryInput.extendedApi(lib.layoutModel.pluginApi());

        promises = lib.layoutModel.init(conf).add({
            misc : lib.misc(),
            bindStaticElements : lib.bindStaticElements(),
            bindBeforeSubmitActions : queryInput.bindBeforeSubmitActions(
                $('#make-concordance-button'), lib.layoutModel),
            bindQueryFieldsetsEvents : queryInput.bindQueryFieldsetsEvents(
                lib.extendedApi,
                lib.layoutModel.userSettings),
            bindParallelCorporaCheckBoxes : lib.bindParallelCorporaCheckBoxes(),
            updateToggleableFieldsets : queryInput.updateToggleableFieldsets(
                lib.extendedApi,
                lib.layoutModel.userSettings),
            makePrimaryButtons : lib.makePrimaryButtons(),
            queryStorage : queryStorage.createInstance(lib.extendedApi),
            liveAttributesInit : liveAttributes.init(lib.extendedApi, '#live-attrs-update', '#live-attrs-reset',
                '.text-type-params')
        });

        lib.layoutModel.registerPlugin('queryStorage', promises.get('queryStorage'));
        lib.layoutModel.mouseOverImages();
        return promises;
    };

    return lib;
});
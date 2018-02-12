/*
 * Copyright (c) 2018 Charles University in Prague, Faculty of Arts,
 *                    Institute of the Czech National Corpus
 * Copyright (c) 2018 Tomas Machalek <tomas.machalek@gmail.com>
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

/// <reference path="../types/common.d.ts" />


import {PageModel} from '../app/main';
import authPlugin from 'plugins/auth/init';

declare var require:any;
// weback - ensure a style (even empty one) is created for the page
require('styles/userProfile.less');


export function init(conf:Kontext.Conf):void {
    const layoutModel = new PageModel(conf);

    layoutModel.init().then(
        () => {
            layoutModel.renderReactComponent(
                layoutModel.getAuthPlugin().getProfileView(),
                document.getElementById('user-profile-mount'),
                {}
            );
        }
    ).catch(
        (err) => {
            console.error(err);
        }
    )
}
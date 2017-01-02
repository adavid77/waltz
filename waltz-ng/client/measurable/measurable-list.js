/*
 * Waltz - Enterprise Architecture
 * Copyright (C) 2016  Khartec Ltd.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
import _ from 'lodash';
import {buildHierarchies, initialiseData, switchToParentIds} from '../common';
import {measurableKindNames} from '../common/services/display-names';
import {measurableKindDescriptions} from '../common/services/descriptions';


const initialState = {
    visibility: {
        tab: null
    },
    treeOptions: {
        nodeChildren: "children",
        dirSelectable: true,
        equality: function(node1, node2) {
            if (node1 && node2) {
                return node1.id === node2.id;
            } else {
                return false;
            }
        }
    }
};


function prepareTabs(measurables = []) {
    const allMeasurableKinds = _.keys(measurableKindNames);
    const measurablesByKind = _.groupBy(measurables, 'kind');

    const tabs = _.map(allMeasurableKinds, k => {
        const kind = {
            code: k,
            name: measurableKindNames[k],
            description: measurableKindDescriptions[k]
        };
        const measurablesForKind = measurablesByKind[k];
        const treeData = switchToParentIds(buildHierarchies(measurablesForKind));
        const expandedNodes = treeData.length < 6  // pre-expand small trees
            ? treeData
            : [];

        return {
            kind,
            measurables: measurablesForKind,
            treeData,
            expandedNodes
        };
    });

    return _.sortBy(
        tabs,
        g => g.kind.name);
}


function findFirstNonEmptyTab(tabs = []) {
    const tab = _.find(tabs, t => t.measurables > 0);
    return (tab || tabs[0]).kind.code;
}


function controller($state,
                    $stateParams,
                    measurableStore,
                    staticPanelStore,
                    svgStore) {

    const vm = initialiseData(this, initialState);

    measurableStore
        .findAll()
        .then(ms => {
            vm.tabs = prepareTabs(ms);
            vm.visibility.tab = $stateParams.kind || findFirstNonEmptyTab(vm.tabs);
        });

    staticPanelStore
        .findByGroup("HOME.MEASURABLE")
        .then(panels => vm.panels = panels);

    svgStore
        .findByKind('MEASURABLE')
        .then(xs => vm.diagrams = xs);

    vm.blockProcessor = b => {
        b.block.onclick = () => $state.go('main.measurable.view', { id: b.value });
        angular.element(b.block).addClass('clickable');
    };


}


controller.$inject = [
    '$state',
    '$stateParams',
    'MeasurableStore',
    'StaticPanelStore',
    'SvgDiagramStore'
];


export default {
    template: require('./measurable-list.html'),
    controller,
    controllerAs: 'ctrl'
};
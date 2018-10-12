import template from "./scenario-header.html";
import {initialiseData} from "../../../common";
import {CORE_API} from "../../../common/services/core-api-utils";
import roles from "../../../user/roles";


const bindings = {
    scenarioId: "<",
    availableSections: "<",
    openSections: "<",
    onAddSection: "<"
};


const modes = {
    LOADING: "LOADING",
    VIEW: "VIEW",
    CONFIGURE_SCENARIO: "CONFIGURE_SCENARIO"
};


function controller($q,
                    notification,
                    serviceBroker,
                    userService)
{
    const vm = initialiseData(this, initialState);

    vm.$onInit = () => {
        vm.visibility.mode = modes.LOADING;

        reloadAllData()
            .then(() => vm.visibility.mode = modes.VIEW);

        userService
            .whoami()
            .then(u => vm.permissions = {
                admin: userService.hasRole(u, roles.SCENARIO_ADMIN),
                edit: userService.hasRole(u, roles.SCENARIO_EDITOR)
            });

    };


    vm.onSaveScenarioName = (ctx, data) => {
        return updateField(
            ctx.id,
            CORE_API.ScenarioStore.updateName,
            data,
            true,
            "Scenario name updated")
            .then(() => reloadAllData());
    };

    vm.onSaveScenarioDescription = (ctx, data) => {
        return updateField(
            ctx.id,
            CORE_API.ScenarioStore.updateDescription,
            data,
            false,
            "Scenario description updated")
            .then(() => reloadAllData());
    };

    vm.onSaveScenarioEffectiveDate = (ctx, data) => {
        return updateField(
            ctx.id,
            CORE_API.ScenarioStore.updateEffectiveDate,
            data,
            true,
            "Scenario target date updated");
    };

    vm.onSaveScenarioStatus = (data, ctx) => {
        return updateField(
            ctx.id,
            CORE_API.ScenarioStore.updateScenarioStatus,
            { newVal: data },   // as this is coming from enum field, we need to fake out change object
            true,
            "Scenario status updated");
    };

    vm.onConfigureScenario = () => {
        vm.visibility.mode = modes.CONFIGURE_SCENARIO;
    };


    vm.onAddAxisItem = (axisItem) => {
        const args = [
            vm.scenario.id,
            axisItem.orientation,
            axisItem.domainItem,
            axisItem.position
        ];
        return serviceBroker
            .execute(
                CORE_API.ScenarioStore.addAxisItem,
                args);

    };

    vm.onRemoveAxisItem = (axisItem) => {
        const args = [
            vm.scenario.id,
            axisItem.orientation,
            axisItem.domainItem
        ];
        return serviceBroker
            .execute(
                CORE_API.ScenarioStore.removeAxisItem,
                args);
    };

    vm.onRepositionAxisItems = (scenarioId, orientation, ids) => {
        const args = [
            vm.scenario.id,
            orientation,
            ids
        ];

        return serviceBroker
            .execute(
                CORE_API.ScenarioStore.reorderAxis,
                args);
    };

    vm.onCancel = () => {
        vm.visibility.mode = modes.VIEW;
        reloadAllData();
    };


    // -- helpers --

    function updateField(roadmapId,
                         method,
                         data,
                         preventNull = true,
                         message = "Updated") {
        if (preventNull && (_.isEmpty(data.newVal) && !_.isDate(data.newVal))) {
            return Promise.reject("Waltz:updateField - Cannot set an empty value");
        }
        if (data.newVal !== data.oldVal) {
            return serviceBroker
                .execute(
                    method,
                    [ roadmapId, data.newVal ])
                .then(() => notification.success(message));
        } else {
            return Promise.reject("Nothing updated")
        }
    }


    function reloadAllData() {
        const roadmapPromise = serviceBroker
            .loadViewData(
                CORE_API.ScenarioStore.getById,
                [ vm.scenarioId ],
                { force: true })
            .then(r => Object.assign(vm, r.data));

        return $q
            .all([roadmapPromise]);
    }

}


const initialState = {
    modes,
    roadmap: null,
    permissions: {
        admin: false,
        edit: false
    },
    visibility: {
        mode: modes.LOADING
    }
};


controller.$inject = [
    "$q",
    "Notification",
    "ServiceBroker",
    "UserService"
];


const component = {
    bindings,
    template,
    controller
};


export default {
    id: "waltzScenarioHeader",
    component
};
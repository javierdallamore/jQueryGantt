/*global require window console*/
require.config({
    baseUrl: "./",
    paths: {
        "jquery": "libs/jquery",
        "jqueryui": "libs/jquery-ui",
        "jquerytimers": "libs/jquery.timers",
        "gantt.utilities": "src/ganttUtilities",
        "gantt.master": "src/ganttMaster",
        "gantt.drawer": "src/ganttDrawer",
        "gantt.grid.editor": "src/ganttGridEditor",
        "gantt.task": "src/ganttTask",
        "dustjs": "libs/dust",
        "text": "libs/text"
    },

    shim: {
        jqueryui: {
            exports: "$",
            deps: ["jquery"]
        },
        jquerytimers: {
            exports: "$",
            deps: ["jquery", "jqueryui"]
        },
        dustjs: {
            exports: "dust"
        },
        "gantt.master": {
            deps: ["jquerytimers", "gantt.utilities", "gantt.drawer", "gantt.grid.editor", "gantt.task"]
        },
        "gantt.drawer": {
            deps: ["jquerytimers", "gantt.utilities"]
        },
        "gantt.grid.editor": {
            deps: ["jquery", "gantt.utilities", "gantt.task"]
        },
        "gantt.task": {
            deps: ["gantt.utilities"]
        },
        "gantt.utilities": {
            deps: ["jquery", "dustjs"]
        }
    }
});

require(["require",
        "jquery",
        "dustjs",
        "libs/platform",
        "libs/i18nJs",
        "libs/date",
        "gantt.master", "gantt.utilities",
        "tpl/load-templates"
], function (req, $, Dust, Platform, i18nJs, date, Gantt, GanttUtilities, loadTemplates) {
    "use strict";
    window.Gantt = Gantt;
    return Gantt;
});

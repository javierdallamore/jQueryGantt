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
        "tpl/load-templates",
        "text!css/platform.css",
        "text!css/gantt.css"
], function (req, $, Dust, Platform, i18nJs, date, Gantt, GanttUtilities, loadTemplates, platformCss, ganttCss) {
    "use strict";
    var ge, $workSpace, ret, res, i, offset;
    function toUrl(url) {
        return req.toUrl(url).replace("?rev=1", "");
    }

    function registerTemplate(tpl, templateName) {
        var template = Dust.compile(tpl, templateName);
        Dust.loadSource(template);
    }
    GanttUtilities.injectCss(platformCss.replaceAll("APP_PATH", toUrl("./css/img")), "all", "platform-gantt-style");
    GanttUtilities.injectCss(ganttCss.replaceAll("APP_PATH", toUrl("./css/img")), "all", "gantt-style");

    // here starts gantt initialization
    ge = new Gantt();
    ge.init("#workSpace", $(window).height(), $(window).width());

    //this is a simulation: load data from the local storage if you have already played with the demo or a textarea with starting demo data
    ret = {
        "canWrite" : true,
        "canWriteOnParent" : true,
        "deletedTaskIds" : [],
        "selectedRow" : 0,
        "tasks" : [{"id": -1,"name":"Gantt editor","code":"","level":0,"status":"STATUS_ACTIVE","start":1346623200000,"duration":16,"end":1348523999999,"startIsMilestone":true,"endIsMilestone":false,"assigs":[]},
    {"id":-2,"name":"coding","code":"","level":1,"status":"STATUS_ACTIVE","start":1346623200000,"duration":10,"end":1347659999999,"startIsMilestone":false,"endIsMilestone":false,"assigs":[],"description":"","progress":0},
    {"id":-3,"name":"gant part","code":"","level":2,"status":"STATUS_ACTIVE","start":1346623200000,"duration":2,"end":1346795999999,"startIsMilestone":false,"endIsMilestone":false,"assigs":[],"depends":""},
    {"id":-4,"name":"editor part","code":"","level":2,"status":"STATUS_SUSPENDED","start":1346796000000,"duration":4,"end":1347314399999,"startIsMilestone":false,"endIsMilestone":false,"assigs":[],"depends":"3"},
    {"id":-5,"name":"testing","code":"","level":1,"status":"STATUS_SUSPENDED","start":1347832800000,"duration":6,"end":1348523999999,"startIsMilestone":false,"endIsMilestone":false,"assigs":[],"depends":"2:5","description":"","progress":0},
    {"id":-6,"name":"test on safari","code":"","level":2,"status":"STATUS_SUSPENDED","start":1347832800000,"duration":2,"end":1348005599999,"startIsMilestone":false,"endIsMilestone":false,"assigs":[],"depends":""},
    {"id":-7,"name":"test on ie","code":"","level":2,"status":"STATUS_SUSPENDED","start":1348005600000,"duration":3,"end":1348264799999,"startIsMilestone":false,"endIsMilestone":false,"assigs":[],"depends":"6"},
    {"id":-8,"name":"test on chrome","code":"","level":2,"status":"STATUS_SUSPENDED","start":1348005600000,"duration":2,"end":1348178399999,"startIsMilestone":false,"endIsMilestone":false,"assigs":[],"depends":"6"}
]
    };

    ret.roles = [{
        id: "tmp_1",
        name: "Project Manager"
    }, {
        id: "tmp_2",
        name: "Worker"
    }, {
        id: "tmp_3",
        name: "Stakeholder/Customer"
    }];

    res = [];
    for (i = 1; i <= 10; i += 1) {
        res.push({
            id: "tmp_" + i,
            name: "Resource " + i
        });
    }

    ret.resources = res;
    ge.loadProject(ret);
    ge.checkpoint(); //empty the undo stack
});

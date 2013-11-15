/*global require window console*/
require.config({
    baseUrl: "./",
    paths: {
        text: "libs/text",
        gantt: "./target/src/main"
    }
});

require(["target/src/main",
        "text!js/entities.json",
        "js/css",
        "text!css/platform.css",
        "text!css/gantt.css"
], function (Gantt, entitiesText, Css, platformCss, ganttCss) {
    "use strict";
    var ge, $workSpace, ret, res, i, offset,
        entities = JSON.parse(entitiesText);
    Css.inject(platformCss, "all", "platformCss");
    Css.inject(ganttCss, "all", "ganttCss");

    // here starts gantt initialization
    ge = new window.GanttMaster();
    ge.init("#workSpace", $(window).height(), $(window).width());

    //this is a simulation: load data from the local storage if you have already played with the demo or a textarea with starting demo data
    ret = {
        "canWrite" : true,
        "canWriteOnParent" : true,
        "deletedTaskIds" : [],
        "selectedRow" : 0,
        "tasks" : entities.tasks,
        "roles" : entities.roles,
        "resources": entities.resources
    };

    ge.loadProject(ret);
    ge.checkpoint(); //empty the undo stack
});

({
    appDir: "../",
    baseUrl: "./",
    dir: "../target",
    modules: [{ name: "src/ganttMaster" }],
    paths: {
        "jquery": "libs/jquery",
        "jqueryui": "libs/jquery-ui",
        "jquerytimers": "libs/jquery.timers",
        "gantt.master": "src/ganttMaster",
        "gantt.drawer": "src/ganttDrawer",
        "gantt.grid.editor": "src/ganttGridEditor",
        "gantt.task": "src/ganttTask",
        "gantt.utilities": "src/ganttUtilities",
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
            exports: "GanttMaster",
            deps: ["jquerytimers", "gantt.utilities", "gantt.drawer", "gantt.grid.editor", "gantt.task"]
        },
        "gantt.drawer": {
            exports: "GanttDrawer",
            deps: ["jquerytimers", "gantt.utilities"]
        },
        "gantt.grid.editor": {
            exports: "GanttGridEditor",
            deps: ["jquery", "gantt.utilities", "gantt.task"]
        },
        "gantt.task": {
            exports: "GanttModel",
            deps: ["gantt.utilities"]
        },
        "gantt.utilities": {
            exports: "GanttUtilities",
            deps: ["jquery", "dustjs"]
        }
    }
})

({
    appDir: "../",
    baseUrl: "./",
    dir: "../target",
    modules: [{ name: "js/main" }],
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
        }
    }
})

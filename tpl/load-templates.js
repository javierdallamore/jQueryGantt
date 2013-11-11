/*global require window define*/
(function (root, factory) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(["dustjs", "text!../tpl/taskbar.html",
           "text!../tpl/task-row.html",
           "text!../tpl/task-edit-head.html",
           "text!../tpl/task-empty-row.html",
           "text!../tpl/change-status.html",
           "text!../tpl/task-editor.html",
           "text!../tpl/assignment-row.html"], function (Dust, taskbarTpl, taskRowTpl, taskEditHeadTpl,
             taskEmptyRowTpl, changeStatusTpl, taskEditorTpl,
             assignmentRowTpl) {
            // Also create a global in case some scripts
            // that are loaded still are looking for
            // a global even when an AMD loader is in use.
            return (root.GanttTemplates = factory(Dust, taskbarTpl, taskRowTpl, taskEditHeadTpl,
             taskEmptyRowTpl, changeStatusTpl, taskEditorTpl,
             assignmentRowTpl));
        });
    } else {
        // Browser globals
        root.GanttTemplates = factory(root.Dust);
    }
}(this, function (Dust, taskbarTpl, taskRowTpl, taskEditHeadTpl,
                  taskEmptyRowTpl, changeStatusTpl, taskEditorTpl,
                  assignmentRowTpl) {
    "use strict";
    function registerTemplate(tpl, templateName) {
        var template = Dust.compile(tpl, templateName);
        Dust.loadSource(template);
    }
    registerTemplate(taskbarTpl, "taskbar");
    registerTemplate(taskRowTpl, "taskRow");
    registerTemplate(taskEditHeadTpl, "taskEditHead");
    registerTemplate(taskEmptyRowTpl, "taskEmptyRow");
    registerTemplate(changeStatusTpl, "changeStatus");
    registerTemplate(taskEditorTpl, "taskEditor");
    registerTemplate(assignmentRowTpl, "assignmentRow");
}));

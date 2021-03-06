/*
  Copyright (c) 2012-2013 Open Lab
  Written by Roberto Bicchierai and Silvia Chelazzi http://roberto.open-lab.com
  Permission is hereby granted, free of charge, to any person obtaining
  a copy of this software and associated documentation files (the
  "Software"), to deal in the Software without restriction, including
  without limitation the rights to use, copy, modify, merge, publish,
  distribute, sublicense, and/or sell copies of the Software, and to
  permit persons to whom the Software is furnished to do so, subject to
  the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
  LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
  WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/*global window define */
(function (root, factory) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(["jquerytimers", 'gantt.utilities', 'gantt.drawer', 'gantt.grid.editor', 'gantt.task'], function ($, GanttUtilities, GanttDrawer, GanttGridEditor, GanttModel) {
            // Also create a global in case some scripts
            // that are loaded still are looking for
            // a global even when an AMD loader is in use.
            return (root.GanttMaster = factory($, GanttUtilities, GanttDrawer, GanttGridEditor, GanttModel));
        });
    } else {
        // Browser globals
        root.GanttMaster = factory(root.jQuery, root.GanttUtilities, root.GanttDrawer, root.GanttGridEditor, root.GanttModel);
    }
}(this, function ($, GanttUtilities, GanttDrawer, GanttGridEditor, GanttModel) {
    "use strict";

    function GanttMaster() {
        this.tasks = [];
        this.deletedTaskIds = [];
        this.links = [];

        this.editor = null; //element for editor
        this.gantt = null; //element for gantt

        this.element = null;


        this.resources = []; //list of resources
        this.roles = [];  //list of roles

        this.minEditableDate = 0;
        this.maxEditableDate = Infinity;

        this.canWriteOnParent = true;
        this.canWrite = true;

        this.firstDayOfWeek = Date.firstDayOfWeek;

        this.currentTask = null; // task currently selected;

        this.__currentTransaction = null;  // a transaction object holds previous state during changes
        this.__undoStack = [];
        this.__redoStack = [];

        var self = this;
    }

    GanttMaster.prototype.init = function (placeId, height, width) {
        var splitter,
            self = this;
        this.element = $(placeId);
        this.element.css({
            width: width,
            height: height
        });

        //create editor
        this.editor = new GanttGridEditor(this);
        this.editor.element.width(this.element.width() * 0.9 - 10);
        this.element.append(this.editor.element);

        //create gantt
        this.gantt = new GanttDrawer("m", new Date().getTime() - 3600000 * 24 * 2, new Date().getTime() + 3600000 * 24 * 15, this, this.element.width() * 0.6);

        //setup splitter
        splitter = $.splittify.init(this.element, this.editor.element, this.gantt.element, 70);
        splitter.secondBox.css("overflow-y", "auto").scroll(function () {
            splitter.firstBox.scrollTop(splitter.secondBox.scrollTop());
        });
        return this.element;
    };

    GanttMaster.messages = {
        "CHANGE_OUT_OF_SCOPE": "NO_RIGHTS_FOR_UPDATE_PARENTS_OUT_OF_EDITOR_SCOPE",
        "START_IS_MILESTONE": "START_IS_MILESTONE",
        "END_IS_MILESTONE": "END_IS_MILESTONE",
        "TASK_HAS_CONSTRAINTS": "TASK_HAS_CONSTRAINTS",
        "GANTT_ERROR_DEPENDS_ON_OPEN_TASK": "GANTT_ERROR_DEPENDS_ON_OPEN_TASK",
        "GANTT_ERROR_DESCENDANT_OF_CLOSED_TASK": "GANTT_ERROR_DESCENDANT_OF_CLOSED_TASK",
        "TASK_HAS_EXTERNAL_DEPS": "TASK_HAS_EXTERNAL_DEPS",
        "GANTT_ERROR_LOADING_DATA_TASK_REMOVED": "GANTT_ERROR_LOADING_DATA_TASK_REMOVED",
        "CIRCULAR_REFERENCE": "CIRCULAR_REFERENCE",
        "ERROR_SETTING_DATES": "ERROR_SETTING_DATES",
        "CANNOT_DEPENDS_ON_ANCESTORS": "CANNOT_DEPENDS_ON_ANCESTORS",
        "CANNOT_DEPENDS_ON_DESCENDANTS": "CANNOT_DEPENDS_ON_DESCENDANTS",
        "INVALID_DATE_FORMAT": "INVALID_DATE_FORMAT",
        "GANTT_QUARTER_SHORT": "GANTT_QUARTER_SHORT",
        "GANTT_SEMESTER_SHORT": "GANTT_SEMESTER_SHORT"
    };


    GanttMaster.prototype.createTask = function (id, name, code, level, start, duration) {
        var factory = new GanttModel.TaskFactory();
        return factory.build(id, name, code, level, start, duration);
    };


    GanttMaster.prototype.createResource = function (id, name) {
        var res = new GanttModel.Resource(id, name);
        return res;
    };


    //update depends strings
    GanttMaster.prototype.updateDependsStrings = function () {
        var i, link, dep;
        //remove all deps
        for (i = 0; i < this.tasks.length; i += 1) {
            this.tasks[i].depends = "";
        }

        for (i = 0; i < this.links.length; i += 1) {
            link = this.links[i];
            dep = link.to.depends;
            link.to.depends = link.to.depends + (link.to.depends === "" ? "" : ",") + (link.from.getRow() + 1) + (link.lag ? ":" + link.lag : "");
        }

    };

    //------------------------------------  ADD TASK --------------------------------------------
    GanttMaster.prototype.addTask = function (task, row) {
        //console.debug("master.addTask",task,row,this);
        task.master = this; // in order to access controller from task

        //replace if already exists
        var pos = -1, i, linkLoops, ret;
        for (i = 0; i < this.tasks.length; i += 1) {
            if (task.id === this.tasks[i].id) {
                pos = i;
                break;
            }
        }

        if (pos >= 0) {
            this.tasks.splice(pos, 1);
            row = parseInt(pos, 10);
        }

        //add task in collection
        if (typeof(row) !== "number") {
            this.tasks.push(task);
        } else {
            this.tasks.splice(row, 0, task);

            //recompute depends string
            this.updateDependsStrings();
        }

        //add Link collection in memory
        linkLoops = !this.updateLinks(task);

        //set the status according to parent
        if (task.getParent()) {
            task.status = task.getParent().status;
        }
        else {
            task.status = "STATUS_ACTIVE";
        }


        ret = task;
        if (linkLoops || !task.setPeriod(task.start, task.end)) {
            //remove task from in-memory collection
            //console.debug("removing task from memory",task);
            this.tasks.splice(task.getRow(), 1);
            ret = undefined;
        } else {
            //append task to editor
            this.editor.addTask(task, row);
            //append task to gantt
            this.gantt.addTask(task);
        }
        return ret;
    };


    /**
     * a project contais tasks, resources, roles, and info about permisions
     * @param project
     */
    GanttMaster.prototype.loadProject = function (project) {
        this.beginTransaction();
        this.resources = project.resources;
        this.roles = project.roles;
        this.canWrite = project.canWrite;
        this.canWriteOnParent = project.canWriteOnParent;

        if (project.minEditableDate) {
            this.minEditableDate = GanttUtilities.computeStart(project.minEditableDate);
        }
        else {
            this.minEditableDate = -Infinity;
        }

        if (project.maxEditableDate) {
            this.maxEditableDate = GanttUtilities.computeEnd(project.maxEditableDate);
        }
        else {
            this.maxEditableDate = Infinity;
        }

        this.loadTasks(project.tasks, project.selectedRow);
        this.deletedTaskIds = [];
        this.endTransaction();
        var self = this;
        this.gantt.element.oneTime(200, function () {
            self.gantt.centerOnToday();
        });
    };

    GanttMaster.prototype.loadTasks = function (tasks, selectedRow) {
        var i, linkLoops, t, key, task, factory = new GanttModel.TaskFactory();
        //reset
        this.reset();

        for (i = 0; i < tasks.length; i += 1) {
            task = tasks[i];
            if (!(task instanceof GanttModel.Task)) {
                t = factory.build(task.id, task.name, task.code, task.level, task.start, task.duration);
                for (key in task) {
                    if (key !== "end" && key !== "start") {
                        t[key] = task[key]; //copy all properties
                    }
                }
                task = t;
            }
            task.master = this; // in order to access controller from task

            /*//replace if already exists
              var pos = -1;
              for (var i=0;i<this.tasks.length;i++) {
              if (task.id == this.tasks[i].id) {
              pos = i;
              break;
              }
              }*/

            this.tasks.push(task);  //append task at the end
        }

        for (i = 0; i < this.tasks.length; i += 1) {
            task = this.tasks[i];

            //add Link collection in memory
            linkLoops = !this.updateLinks(task);

            if (linkLoops || !task.setPeriod(task.start, task.end)) {
                alert(GanttMaster.messages.GANNT_ERROR_LOADING_DATA_TASK_REMOVED + "\n" + task.name + "\n" +
                      (linkLoops ? GanttMaster.messages.CIRCULAR_REFERENCE:GanttMaster.messages.ERROR_SETTING_DATES));

                //remove task from in-memory collection
                this.tasks.splice(task.getRow(), 1);
            } else {
                //append task to editor
                this.editor.addTask(task);
                //append task to gantt
                this.gantt.addTask(task);
            }
        }

        this.editor.fillEmptyLines();
        //prof.stop();

        // re-select old row if tasks is not empty
        if (this.tasks && this.tasks.length > 0) {
            selectedRow = selectedRow ? selectedRow : 0;
            this.tasks[selectedRow].rowElement.click();
        }

    };


    GanttMaster.prototype.getTask = function (taskId) {
        var tsk, ret, i;
        for (i = 0;i < this.tasks.length; i += 1) {
            tsk = this.tasks[i];
            if (tsk && tsk.id && tsk.id.toString() === taskId.toString()) {
                ret = tsk;
                break;
            }
        }
        return ret;
    };


    GanttMaster.prototype.getResource = function (resId) {
        var ret, res, i;
        for (i = 0; i < this.resources.length; i += 1) {
            res = this.resources[i];
            if (res && res.id && res.id.toString() === resId.toString()) {
                ret = res;
                break;
            }
        }
        return ret;
    };


    GanttMaster.prototype.changeTaskDates = function (task, start, end) {
        return task.setPeriod(start, end);
    };


    GanttMaster.prototype.moveTask = function (task, newStart) {
        return task.moveTo(newStart, true);
    };


    GanttMaster.prototype.taskIsChanged = function () {
        //console.debug("taskIsChanged");
        var master = this;

        //refresh is executed only once every 50ms
        this.element.stopTime("gnnttaskIsChanged");
        //var profilerext = new Profiler("gm_taskIsChangedRequest");
        this.element.oneTime(50, "gnnttaskIsChanged", function () {
            //console.debug("task Is Changed real call to redraw");
            //var profiler = new Profiler("gm_taskIsChangedReal");
            master.editor.redraw();
            master.gantt.refreshGantt();
            //profiler.stop();
        });
        //profilerext.stop();
    };


    GanttMaster.prototype.redraw = function () {
        this.editor.redraw();
        this.gantt.refreshGantt();
    };

    GanttMaster.prototype.reset = function () {
        this.tasks = [];
        this.links = [];
        this.deletedTaskIds = [];
        this.__undoStack = [];
        this.__redoStack = [];
        delete this.currentTask;

        this.editor.reset();
        this.gantt.reset();
    };


    GanttMaster.prototype.showTaskEditor = function (taskId) {
        var task = this.getTask(taskId);
        task.rowElement.find(".edit").click();
    };

    GanttMaster.prototype.saveProject = function () {
        return this.saveGantt(false);
    };

    GanttMaster.prototype.saveGantt = function (forTransaction) {
        //var prof = new Profiler("gm_saveGantt");
        var i, ret, task, cloned, saved = [];
        for (i = 0; i < this.tasks.length; i += 1) {
            task = this.tasks[i];
            cloned = task.clone();
            delete cloned.master;
            delete cloned.rowElement;
            delete cloned.ganttElement;

            saved.push(cloned);
        }

        ret = {tasks: saved};
        if (this.currentTask) {
            ret.selectedRow = this.currentTask.getRow();
        }

        ret.deletedTaskIds = this.deletedTaskIds;  //this must be consistent with transactions and undo

        if (!forTransaction) {
            ret.resources = this.resources;
            ret.roles = this.roles;
            ret.canWrite = this.canWrite;
            ret.canWriteOnParent = this.canWriteOnParent;
        }

        //prof.stop();
        return ret;
    };


    GanttMaster.prototype.updateLinks = function (task) {
        //console.debug("updateLinks");
        //var prof= new Profiler("gm_updateLinks");

        // defines isLoop function
        function isLoop(task, target, visited) {
            if (target === task) {
                return true;
            }

            var i, supLink, sups = task.getSuperiors(),
            loop = false;
            for (i = 0; i < sups.length; i += 1) {
                supLink = sups[i];
                if (supLink.from === target) {
                    loop = true;
                    break;
                } else {
                    if (visited.indexOf(supLink.from) <= 0) {
                        visited.push(supLink.from);
                        if (isLoop(supLink.from, target, visited)) {
                            loop = true;
                            break;
                        }
                    }
                }
            }
            return loop;
        }

        //remove my depends
        this.links = this.links.filter(function (link) {
            return link.to !== task;
        });
        var todoOk = true, parents, descendants, deps, newDepsString,
            visited, j, dep, par, lag, sup;
        if (task.depends) {
            //cannot depend from an ancestor
            parents = task.getParents();
            //cannot depend from descendants
            descendants = task.getDescendant();

            deps = task.depends.split(",");
            newDepsString = "";

            visited = [];
            for (j = 0; j < deps.length; j += 1) {
                dep = deps[j]; // in the form of row(lag) e.g. 2:3,3:4,5
                par = dep.split(":");
                lag = 0;

                if (par.length > 1) {
                    lag = parseInt(par[1], 10);
                }

                sup = this.tasks[parseInt(par[0] - 1, 10)];

                if (sup) {
                    if (parents && parents.indexOf(sup) >= 0) {
                        this.setErrorOnTransaction(task.name + "\n" + GanttMaster.messages.CANNOT_DEPENDS_ON_ANCESTORS + "\n" + sup.name);
                        todoOk = false;

                    } else if (descendants && descendants.indexOf(sup) >= 0) {
                        this.setErrorOnTransaction(task.name + "\n" + GanttMaster.messages.CANNOT_DEPENDS_ON_DESCENDANTS + "\n" + sup.name);
                        todoOk = false;

                    } else if (isLoop(sup, task, visited)) {
                        todoOk = false;
                        this.setErrorOnTransaction(GanttMaster.messages.CIRCULAR_REFERENCE + "\n" + task.name + " -> " + sup.name);
                    } else {
                        this.links.push(new GanttModel.Link(sup, task, lag));
                        newDepsString = newDepsString + (newDepsString.length > 0 ? "," : "") + dep;
                    }
                }
            }

            if (todoOk) {
                task.depends = newDepsString;
            }

        }

        //prof.stop();

        return todoOk;
    };


    //<%----------------------------- TRANSACTION MANAGEMENT ---------------------------------%>
    GanttMaster.prototype.beginTransaction = function () {
        if (!this.__currentTransaction) {
            this.__currentTransaction = {
                snapshot: JSON.stringify(this.saveGantt(true)),
                errors: []
            };
        } else {
            console.error("Cannot open twice a transaction");
        }
        return this.__currentTransaction;
    };


    GanttMaster.prototype.endTransaction = function () {
        if (!this.__currentTransaction) {
            console.error("Transaction never started.");
            return true;
        }

        var i, task, ret = true, oldTasks, msg, err;

        //no error -> commit
        if (this.__currentTransaction.errors.length <= 0) {
            //console.debug("committing transaction");

            //put snapshot in undo
            this.__undoStack.push(this.__currentTransaction.snapshot);
            //clear redo stack
            this.__redoStack = [];

            //shrink gantt bundaries
            this.gantt.originalStartMillis = Infinity;
            this.gantt.originalEndMillis = -Infinity;
            for (i = 0; i < this.tasks.length;i += 1) {
                task = this.tasks[i];
                if (this.gantt.originalStartMillis > task.start) {
                    this.gantt.originalStartMillis = task.start;
                }
                if (this.gantt.originalEndMillis < task.end) {
                    this.gantt.originalEndMillis = task.end;
                }
            }
            this.taskIsChanged(); //enqueue for gantt refresh


            //error -> rollback
        } else {
            ret = false;
            //console.debug("rolling-back transaction");
            //try to restore changed tasks
            oldTasks = JSON.parse(this.__currentTransaction.snapshot);
            this.deletedTaskIds = oldTasks.deletedTaskIds;
            this.loadTasks(oldTasks.tasks, oldTasks.selectedRow);
            this.redraw();

            //compose error message
            msg = "";
            for (i = 0; i < this.__currentTransaction.errors.length; i += 1) {
                err = this.__currentTransaction.errors[i];
                msg = msg + err.msg + "\n\n";
            }
            alert(msg);
        }
        //reset transaction
        this.__currentTransaction = undefined;

        return ret;
    };

    //this function notify an error to a transaction -> transaction will rollback
    GanttMaster.prototype.setErrorOnTransaction = function (errorMessage, task) {
        if (this.__currentTransaction) {
            this.__currentTransaction.errors.push({
                msg: errorMessage,
                task: task
            });
        } else {
            console.error(errorMessage);
        }
    };

    // inhibit undo-redo
    GanttMaster.prototype.checkpoint = function () {
        this.__undoStack = [];
        this.__redoStack = [];
    };

    //----------------------------- UNDO/REDO MANAGEMENT ---------------------------------%>

    GanttMaster.prototype.undo = function () {
        var oldTasks, his;
        //console.debug("undo before:",undoStack,redoStack);
        if (this.__undoStack.length > 0) {
            his = this.__undoStack.pop();
            this.__redoStack.push(JSON.stringify(this.saveGantt()));

            oldTasks = JSON.parse(his);
            this.deletedTaskIds = oldTasks.deletedTaskIds;
            this.loadTasks(oldTasks.tasks, oldTasks.selectedRow);
            //console.debug(oldTasks,oldTasks.deletedTaskIds)
            this.redraw();
            //console.debug("undo after:",undoStack,redoStack);
        }
    };

    GanttMaster.prototype.redo = function () {
        var his, oldTasks;
        if (this.__redoStack.length > 0) {
            his = this.__redoStack.pop();
            this.__undoStack.push(JSON.stringify(this.saveGantt()));

            oldTasks = JSON.parse(his);
            this.deletedTaskIds = oldTasks.deletedTaskIds;
            this.loadTasks(oldTasks.tasks, oldTasks.selectedRow);
            this.redraw();
            //console.debug("redo after:",undoStack,redoStack);
        }
    };
    window.GanttMaster = GanttMaster;
    return GanttMaster;
}));

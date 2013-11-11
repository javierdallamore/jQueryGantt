/*global define, isHoliday*/
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
        define(["jquerytimers", "gantt.utilities"], function ($, GanttUtilities) {
            // Also create a global in case some scripts
            // that are loaded still are looking for
            // a global even when an AMD loader is in use.
            return (root.GanttDrawer = factory($, GanttUtilities));
        });
    } else {
        // Browser globals
        root.GanttDrawer = factory(root.jQuery, root.GanttUtilities);
    }
}(this, function ($, GanttUtilities) {
    "use strict";

    function GanttDrawer(zoom, startmillis, endMillis, master, minGanttSize) {
        this.master = master; // is the a GantEditor instance
        this.highlightBar = null;
        this.zoom = zoom;
        this.minGanttSize = minGanttSize;
        this.includeToday = true; //when true today is always visible. If false boundaries comes from tasks periods

        //this.zoomLevels = ["d","w","m","q","s","y"];
        this.zoomLevels = ["w", "m", "q", "s", "y"];

        this.element = this.create(zoom, startmillis, endMillis);

    }

    GanttDrawer.prototype.zoomGantt = function (isPlus) {
        var curLevel = this.zoom,
            pos = this.zoomLevels.indexOf(curLevel + ""),
            newPos = pos;
        if (isPlus) {
            newPos = pos <= 0 ? 0 : pos - 1;
        } else {
            newPos = pos >= this.zoomLevels.length - 1 ? this.zoomLevels.length - 1 : pos + 1;
        }
        if (newPos !== pos) {
            curLevel = this.zoomLevels[newPos];
            this.zoom = curLevel;
            this.refreshGantt();
        }
    };


    GanttDrawer.prototype.create = function (zoom, originalStartmillis, originalEndMillis) {
        var self = this, today, period, table;

        function getPeriod(zoomLevel, stMil, endMillis) {
            var start = new Date(stMil),
                end = new Date(endMillis);


            //reset hours
            if (zoomLevel === "d") {
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);

                //reset day of week
            } else if (zoomLevel === "w") {
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);

                start.setFirstDayOfThisWeek();
                end.setFirstDayOfThisWeek();
                end.setDate(end.getDate() + 6);

                //reset day of month
            } else if (zoomLevel === "m") {
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);

                start.setDate(1);
                end.setDate(1);
                end.setMonth(end.getMonth() + 1);
                end.setDate(end.getDate() - 1);

                //reset to quarter
            } else if (zoomLevel === "q") {
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                start.setDate(1);
                start.setMonth(Math.floor(start.getMonth() / 3) * 3);
                end.setDate(1);
                end.setMonth(Math.floor(end.getMonth() / 3) * 3 + 3);
                end.setDate(end.getDate() - 1);

                //reset to semester
            } else if (zoomLevel === "s") {
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                start.setDate(1);

                start.setMonth(Math.floor(start.getMonth() / 6) * 6);
                end.setDate(1);
                end.setMonth(Math.floor(end.getMonth() / 6) * 6 + 6);
                end.setDate(end.getDate() - 1);

                //reset to year - > gen
            } else if (zoomLevel === "y") {
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);

                start.setDate(1);
                start.setMonth(0);

                end.setDate(1);
                end.setMonth(12);
                end.setDate(end.getDate() - 1);
            }
            return {
                start: start.getTime(),
                end: end.getTime()
            };
        }

        function createHeadCell(lbl, span, additionalClass) {
            var th = $("<th>").html(lbl).attr("colSpan", span);
            if (additionalClass) {
                th.addClass(additionalClass);
            }
            return th;
        }

        function createBodyCell(span, isEnd, additionalClass) {
            var ret = $("<td>").html("&nbsp;").attr("colSpan", span).addClass("ganttBodyCell");
            if (isEnd) {
                ret.addClass("end");
            }
            if (additionalClass) {
                ret.addClass(additionalClass);
            }
            return ret;
        }

        function createGantt(zoom, startPeriod, endPeriod) {
            var tr1 = $("<tr>").addClass("ganttHead1"),
                tr2 = $("<tr>").addClass("ganttHead2"),
                trBody = $("<tr>").addClass("ganttBody"),
                //this is computed by hand in order to optimize cell size
                computedTableWidth, table, links, hlb, box, today, x;


            function iterate(renderFunction1, renderFunction2) {
                var start = new Date(startPeriod);
                //loop for header1
                while (start.getTime() <= endPeriod) {
                    renderFunction1(start);
                }

                //loop for header2
                start = new Date(startPeriod);
                while (start.getTime() <= endPeriod) {
                    renderFunction2(start);
                }
            }

            // year
            if (zoom === "y") {
                computedTableWidth = Math.floor(((endPeriod - startPeriod) / (3600000 * 24 * 180)) * 100); //180gg = 1 sem = 100px
                iterate(function (date) {
                    tr1.append(createHeadCell(date.format("yyyy"), 2));
                    date.setFullYear(date.getFullYear() + 1);
                }, function (date) {
                    var sem = (Math.floor(date.getMonth() / 6) + 1);
                    tr2.append(createHeadCell(window.GanttMaster.messages.GANTT_SEMESTER_SHORT + sem, 1));
                    trBody.append(createBodyCell(1, sem === 2));
                    date.setMonth(date.getMonth() + 6);
                });

                //semester
            } else if (zoom === "s") {
                computedTableWidth = Math.floor(((endPeriod - startPeriod) / (3600000 * 24 * 90)) * 100); //90gg = 1 quarter = 100px
                iterate(function (date) {
                    var end = new Date(date.getTime());
                    end.setMonth(end.getMonth() + 6);
                    end.setDate(end.getDate() - 1);
                    tr1.append(createHeadCell(date.format("MMM") + " - " + end.format("MMM yyyy"), 2));
                    date.setMonth(date.getMonth() + 6);
                }, function (date) {
                    var quarter = (Math.floor(date.getMonth() / 3) + 1);
                    tr2.append(createHeadCell(window.GanttMaster.messages.GANTT_QUARTER_SHORT + quarter, 1));
                    trBody.append(createBodyCell(1, quarter % 2 === 0));
                    date.setMonth(date.getMonth() + 3);
                });

                //quarter
            } else if (zoom === "q") {
                computedTableWidth = Math.floor(((endPeriod - startPeriod) / (3600000 * 24 * 30)) * 300); //1 month= 300px
                iterate(function (date) {
                    var end = new Date(date.getTime());
                    end.setMonth(end.getMonth() + 3);
                    end.setDate(end.getDate() - 1);
                    tr1.append(createHeadCell(date.format("MMM") + " - " + end.format("MMM yyyy"), 3));
                    date.setMonth(date.getMonth() + 3);
                }, function (date) {
                    var lbl = date.format("MMM");
                    tr2.append(createHeadCell(lbl, 1));
                    trBody.append(createBodyCell(1, date.getMonth() % 3 === 2));
                    date.setMonth(date.getMonth() + 1);
                });

                //month
            } else if (zoom === "m") {
                computedTableWidth = Math.floor(((endPeriod - startPeriod) / (3600000 * 24 * 1)) * 20); //1 day= 20px
                iterate(function (date) {
                    var daysInMonth, sm = date.getTime();
                    date.setMonth(date.getMonth() + 1);
                    daysInMonth = parseInt((date.getTime() - sm) / (3600000 * 24), 10);
                    tr1.append(createHeadCell(new Date(sm).format("MMMM yyyy"), daysInMonth)); //spans mumber of dayn in the month
                }, function (date) {
                    tr2.append(createHeadCell(date.format("d"), 1, isHoliday(date) ? "holyH" : null));
                    var nd = new Date(date.getTime());
                    nd.setDate(date.getDate() + 1);
                    trBody.append(createBodyCell(1, nd.getDate() === 1, isHoliday(date) ? "holy" : null));
                    date.setDate(date.getDate() + 1);
                });

                //week
            } else if (zoom === "w") {
                computedTableWidth = Math.floor(((endPeriod - startPeriod) / (3600000 * 24)) * 30); //1 day= 30px
                iterate(function (date) {
                    var end = new Date(date.getTime());
                    end.setDate(end.getDate() + 6);
                    tr1.append(createHeadCell(date.format("MMM d") + " - " + end.format("MMM d'yy"), 7));
                    date.setDate(date.getDate() + 7);
                }, function (date) {
                    tr2.append(createHeadCell(date.format("EEEE").substr(0, 1), 1, isHoliday(date) ? "holyH" : null));
                    trBody.append(createBodyCell(1, date.getDay() % 7 === (self.master.firstDayOfWeek + 6) % 7, isHoliday(date) ? "holy" : null));
                    date.setDate(date.getDate() + 1);
                });

                //days
            } else if (zoom === "d") {
                computedTableWidth = Math.floor(((endPeriod - startPeriod) / (3600000 * 24)) * 200); //1 day= 200px
                iterate(function (date) {
                    tr1.append(createHeadCell(date.format("EEEE d MMMM yyyy"), 4, isHoliday(date) ? "holyH" : null));
                    date.setDate(date.getDate() + 1);
                }, function (date) {
                    tr2.append(createHeadCell(date.format("HH"), 1, isHoliday(date) ? "holyH" : null));
                    trBody.append(createBodyCell(1, date.getHours() > 17, isHoliday(date) ? "holy" : null));
                    date.setHours(date.getHours() + 6);
                });

            } else {
                console.error("Wrong level " + zoom);
            }

            //set a minimal width
            computedTableWidth = Math.max(computedTableWidth, self.minGanttSize);

            table = $("<table cellspacing=0 cellpadding=0>");
            table.append(tr1).append(tr2).append(trBody).addClass("ganttTable").css({
                width: computedTableWidth
            });
            table.height(self.master.editor.element.height());

            box = $("<div>");
            box.addClass("gantt unselectable").attr("unselectable", "true").css({
                position: "relative",
                width: computedTableWidth
            });
            box.append(table);

            //highlightBar
            hlb = $("<div>").addClass("ganttHighLight");
            box.append(hlb);
            self.highlightBar = hlb;

            //create link container
            links = $("<div>");
            links.addClass("ganttLinks").css({
                position: "absolute",
                top: 0,
                width: computedTableWidth,
                height: "100%"
            });
            box.append(links);


            //compute scalefactor fx
            self.fx = computedTableWidth / (endPeriod - startPeriod);

            // drawTodayLine
            if (new Date().getTime() > self.startMillis && new Date().getTime() < self.endMillis) {
                x = Math.round(((new Date().getTime()) - self.startMillis) * self.fx);
                today = $("<div>").addClass("ganttToday").css("left", x);
                box.append(today);
            }

            return box;
        }

        //if include today synch extremes
        if (this.includeToday) {
            today = new Date().getTime();
            originalStartmillis = originalStartmillis > today ? today:originalStartmillis;
            originalEndMillis = originalEndMillis < today ? today:originalEndMillis;
        }

        //get best dimension fo gantt
        period = getPeriod(zoom, originalStartmillis, originalEndMillis); //this is enlarged to match complete periods basing on zoom level

        //console.debug(new Date(period.start) + "   " + new Date(period.end));
        self.startMillis = period.start; //real dimension of gantt
        self.endMillis = period.end;
        self.originalStartMillis = originalStartmillis; //minimal dimension required by user or by task duration
        self.originalEndMillis = originalEndMillis;

        table = createGantt(zoom, period.start, period.end);

        return table;
    };


    //<%-------------------------------------- GANT TASK GRAPHIC ELEMENT --------------------------------------%>
    GanttDrawer.prototype.drawTask = function (task) {
        //console.debug("drawTask", task.name,new Date(task.start));
        var self = this,
            //var editorRow = self.master.editor.element.find("tr[taskId=" + task.id + "]");
            editorRow = task.rowElement, taskBoxSeparator,
            top = editorRow.position().top + self.master.editor.element.parent().scrollTop(),
            x = Math.round((task.start - self.startMillis) * self.fx),
            taskBox;

        GanttUtilities.renderTemplate("taskbar", {
            id: task.id,
            extDep: task.hasExternalDep ? 'extDep' : '',
            status: task.status,
            progress: task.progress > 100 ? 100: task.progress,
            backgroundcolor: task.progress > 100 ? 'red': 'rgb(153,255,51)',
            startMilestone: task.startIsMilestone ? 'active': '',
            endMilestone: task.endIsMilestone ? 'active': ''
        }, function (err, html) {
            taskBox = $(html);
        });

        //save row element on task
        task.ganttElement = taskBox;

        //if I'm parent
        if (task.isParent()) {
            taskBox.addClass("hasChild");
        }


        taskBox.css({
            top: top,
            left: x,
            width: Math.round((task.end - task.start) * self.fx)
        });

        if (this.master.canWrite) {
            taskBox.resizable({
                handles: 'e' + (task.depends ? "" : ",w"), //if depends cannot move start
                //helper: "ui-resizable-helper",
                //grid:[oneDaySize,oneDaySize],

                resize: function (event, ui) {
                    //console.debug(ui)
                    $(".taskLabel[taskId=" + ui.helper.attr("taskId") + "]").css("width", ui.position.left);
                    event.stopImmediatePropagation();
                    event.stopPropagation();
                },
                stop: function (event, ui) {
                    //console.debug(ui)
                    var task = self.master.getTask(ui.element.attr("taskId")),
                        s = Math.round((ui.position.left / self.fx) + self.startMillis),
                        e = Math.round(((ui.position.left + ui.size.width) / self.fx) + self.startMillis);

                    self.master.beginTransaction();
                    self.master.changeTaskDates(task, new Date(s), new Date(e));
                    self.master.endTransaction();
                }

            });

        }

        taskBox.dblclick(function () {
            self.master.showTaskEditor($(this).closest("[taskId]").attr("taskId"));

        }).mousedown(function () {
            var task = self.master.getTask($(this).attr("taskId"));
            task.rowElement.click();
        });

        //panning only in no depends
        if (!task.depends && this.master.canWrite) {

            taskBox.css("position", "absolute").draggable({
                axis: 'x',
                drag: function (event, ui) {
                    $(".taskLabel[taskId=" + $(this).attr("taskId") + "]").css("width", ui.position.left);
                },
                stop: function (event, ui) {
                    var task = self.master.getTask($(this).attr("taskId")),
                    s = Math.round((ui.position.left / self.fx) + self.startMillis);

                    self.master.beginTransaction();
                    self.master.moveTask(task, new Date(s));
                    self.master.endTransaction();
                }/*,
start:function(event, ui) {
var task = self.master.getTask($(this).attr("taskId"));
var s = Math.round((ui.position.left / self.fx) + self.startMillis);
}*/
            });
        }

        taskBoxSeparator = $("<div class='ganttLines'></div>");
        taskBoxSeparator.css({top: top + taskBoxSeparator.height()});
        //  taskBoxSeparator.css({top:top+18});


        self.element.append(taskBox);
        self.element.append(taskBoxSeparator);

        //ask for redraw link
        self.redrawLinks();

        //prof.stop();
    };


    GanttDrawer.prototype.addTask = function (task) {
        //set new boundaries for gantt
        this.originalEndMillis = this.originalEndMillis > task.end ? this.originalEndMillis : task.end;
        this.originalStartMillis = this.originalStartMillis < task.start ? this.originalStartMillis : task.start;
    };


    //<%-------------------------------------- GANT DRAW LINK ELEMENT --------------------------------------%>
    //'from' and 'to' are tasks already drawn
    GanttDrawer.prototype.drawLink = function (from, to, type) {
        var peduncolusSize = 10, lineSize = 2, rectFrom, rectTo, HLine, VLine;

        /**
         * A representation of a Horizontal line
         */
        HLine = function (width, top, left) {
            var hl = $("<div>").addClass("taskDepLine");
            hl.css({
                height: lineSize,
                left: left,
                width: width,
                top: top - lineSize / 2
            });
            return hl;
        };

        /**
         * A representation of a Vertical line
         */
        VLine = function (height, top, left) {
            var vl = $("<div>").addClass("taskDepLine");
            vl.css({
                height: height,
                left: left - lineSize / 2,
                width: lineSize,
                top: top
            });
            return vl;
        };

        /**
         * Given an item, extract its rendered position
         * width and height into a structure.
         */
        function buildRect(item) {
            var rect = item.ganttElement.position();
            rect.width = item.ganttElement.width();
            rect.height = item.ganttElement.height();

            return rect;
        }

        /**
         * The default rendering method, which paints a start to end dependency.
         *
         * @see buildRect
         */
        function drawStartToEnd(rectFrom, rectTo, peduncolusSize) {
            var left, top, l1, l2, l2Size, l2_4size, l3, l1_3Size, l3size,
                l4, l5, arr,
                ndo = $("<div>").attr({
                    from: from.id,
                    to: to.id
                }),
                currentX = rectFrom.left + rectFrom.width,
                currentY = rectFrom.height / 2 + rectFrom.top,
                useThreeLine = (currentX + 2 * peduncolusSize) < rectTo.left;

            if (!useThreeLine) {
                // L1
                if (peduncolusSize > 0) {
                    l1 = new HLine(peduncolusSize, currentY, currentX);
                    currentX = currentX + peduncolusSize;
                    ndo.append(l1);
                }

                // L2
                l2_4size = ((rectTo.top + rectTo.height / 2) - (rectFrom.top + rectFrom.height / 2)) / 2;
                if (l2_4size < 0) {
                    l2 = new VLine(-l2_4size, currentY + l2_4size, currentX);
                } else {
                    l2 = new VLine(l2_4size, currentY, currentX);
                }
                currentY = currentY + l2_4size;

                ndo.append(l2);

                // L3
                l3size = rectFrom.left + rectFrom.width + peduncolusSize - (rectTo.left - peduncolusSize);
                currentX = currentX - l3size;
                l3 = new HLine(l3size, currentY, currentX);
                ndo.append(l3);

                // L4
                if (l2_4size < 0) {
                    l4 = new VLine(-l2_4size, currentY + l2_4size, currentX);
                } else {
                    l4 = new VLine(l2_4size, currentY, currentX);
                }
                ndo.append(l4);

                currentY = currentY + l2_4size;

                // L5
                if (peduncolusSize > 0) {
                    l5 = new HLine(peduncolusSize, currentY, currentX);
                    currentX = currentX + peduncolusSize;
                    ndo.append(l5);

                }
            } else {
                //L1
                l1_3Size = (rectTo.left - currentX) / 2;
                l1 = new HLine(l1_3Size, currentY, currentX);
                currentX = currentX + l1_3Size;
                ndo.append(l1);

                //L2
                l2Size = ((rectTo.top + rectTo.height / 2) - (rectFrom.top + rectFrom.height / 2));
                if (l2Size < 0) {
                    l2 = new VLine(-l2Size, currentY + l2Size, currentX);
                } else {
                    l2 = new VLine(l2Size, currentY, currentX);
                }
                ndo.append(l2);

                currentY = currentY + l2Size;

                //L3
                l3 = new HLine(l1_3Size, currentY, currentX);
                currentX = currentX + l1_3Size;
                ndo.append(l3);
            }

            //arrow
            arr = $("<img/>")
                .css({
                    position: 'absolute',
                    top: rectTo.top + rectTo.height / 2 - 5,
                    left: rectTo.left - 5
                }).addClass("linkArrow");

            ndo.append(arr);

            return ndo;
        }

        /**
         * A rendering method which paints a start to start dependency.
         *
         * @see buildRect
         */
        function drawStartToStart(rectFrom, rectTo, peduncolusSize) {
            var left, top, l1, l2, l3, l4, l5, l1_3Size, l2Size, l2_4size, l3size, arr,
            ndo = $("<div>").attr({
                from: from.id,
                to: to.id
            }),
            currentX = rectFrom.left,
            currentY = rectFrom.height / 2 + rectFrom.top,
            useThreeLine = (currentX + 2 * peduncolusSize) < rectTo.left;

            if (!useThreeLine) {
                // L1
                if (peduncolusSize > 0) {
                    l1 = new HLine(peduncolusSize, currentY, currentX - peduncolusSize);
                    currentX = currentX - peduncolusSize;
                    ndo.append(l1);
                }

                // L2
                l2_4size = ((rectTo.top + rectTo.height / 2) - (rectFrom.top + rectFrom.height / 2)) / 2;
                if (l2_4size < 0) {
                    l2 = new VLine(-l2_4size, currentY + l2_4size, currentX);
                } else {
                    l2 = new VLine(l2_4size, currentY, currentX);
                }
                currentY = currentY + l2_4size;

                ndo.append(l2);

                // L3
                l3size = (rectFrom.left - peduncolusSize) - (rectTo.left - peduncolusSize);
                currentX = currentX - l3size;
                l3 = new HLine(l3size, currentY, currentX);
                ndo.append(l3);

                // L4
                if (l2_4size < 0) {
                    l4 = new VLine(-l2_4size, currentY + l2_4size, currentX);
                } else {
                    l4 = new VLine(l2_4size, currentY, currentX);
                }
                ndo.append(l4);

                currentY = currentY + l2_4size;

                // L5
                if (peduncolusSize > 0) {
                    l5 = new HLine(peduncolusSize, currentY, currentX);
                    currentX = currentX + peduncolusSize;
                    ndo.append(l5);
                }
            } else {
                //L1

                l1 = new HLine(peduncolusSize, currentY, currentX - peduncolusSize);
                currentX = currentX - peduncolusSize;
                ndo.append(l1);

                //L2
                l2Size = ((rectTo.top + rectTo.height / 2) - (rectFrom.top + rectFrom.height / 2));
                if (l2Size < 0) {
                    l2 = new VLine(-l2Size, currentY + l2Size, currentX);
                } else {
                    l2 = new VLine(l2Size, currentY, currentX);
                }
                ndo.append(l2);

                currentY = currentY + l2Size;

                //L3

                l3 = new HLine(currentX + peduncolusSize + (rectTo.left - rectFrom.left), currentY, currentX);
                currentX = currentX + peduncolusSize + (rectTo.left - rectFrom.left);
                ndo.append(l3);
            }

            //arrow
            arr = $("<img src='http://localhost:8080/gantt/lib/jQueryGantt/css/img/linkArrow.png'>").css({
                position: 'absolute',
                top: rectTo.top + rectTo.height / 2 - 5,
                left: rectTo.left - 5
            });

            ndo.append(arr);

            return ndo;
        }

        rectFrom = buildRect(from);
        rectTo = buildRect(to);

        // Dispatch to the correct renderer
        if (type === 'start-to-start') {
            this.element.find(".ganttLinks").append(
                drawStartToStart(rectFrom, rectTo, peduncolusSize)
            );
        } else {
            this.element.find(".ganttLinks").append(
                drawStartToEnd(rectFrom, rectTo, peduncolusSize)
            );
        }
    };


    GanttDrawer.prototype.redrawLinks = function () {
        //console.debug("redrawLinks ");
        var self = this, i, link;
        this.element.stopTime("ganttlnksredr");
        this.element.oneTime(60, "ganttlnksredr", function () {
            //var prof=new Profiler("gd_drawLink_real");
            self.element.find(".ganttLinks").empty();
            for (i = 0; i < self.master.links.length; i += 1) {
                link = self.master.links[i];
                self.drawLink(link.from, link.to);
            }
            //prof.stop();
        });
    };


    GanttDrawer.prototype.reset = function () {
        this.element.find(".ganttLinks").empty();
        this.element.find("[taskId]").remove();
    };


    GanttDrawer.prototype.redrawTasks = function () {
        var i, task;
        for (i = 0; i < this.master.tasks.length; i += 1) {
            task = this.master.tasks[i];
            this.drawTask(task);
        }
    };


    GanttDrawer.prototype.refreshGantt = function () {
        //console.debug("refreshGantt")
        var domEl, days, par = this.element.parent(),
        //try to maintain last scroll
        scrollY = par.scrollTop(),
        scrollX = par.scrollLeft();

        this.element.remove();
        //guess the zoom level in base of period
        if (!this.zoom) {
            days = (this.originalEndMillis - this.originalStartMillis) / (3600000 * 24);
            this.zoom = this.zoomLevels[days < 2 ? 0 : (days < 15 ? 1 : (days < 60 ? 2 : (days < 150 ? 3 : 4)))];
        }
        domEl = this.create(this.zoom, this.originalStartMillis, this.originalEndMillis);
        this.element = domEl;
        par.append(domEl);
        this.redrawTasks();

        //set old scroll
        //console.debug("old scroll:",scrollX,scrollY)
        par.scrollTop(scrollY);
        par.scrollLeft(scrollX);

        //set current task
        if (this.master.currentTask) {
            this.highlightBar.css("top", this.master.currentTask.ganttElement.position().top);
        }
    };


    GanttDrawer.prototype.fitGantt = function () {
        delete this.zoom;
        this.refreshGantt();
    };

    GanttDrawer.prototype.centerOnToday = function () {
        var x = Math.round(((new Date().getTime()) - this.startMillis) * this.fx) - 30;
        //console.debug("centerOnToday "+x);
        this.element.parent().scrollLeft(x);
    };

    return GanttDrawer;
}));

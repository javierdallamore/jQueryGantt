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
/*global window define document */
(function (root, factory) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery', 'dustjs'], function ($, Dust) {
            // Also create a global in case some scripts
            // that are loaded still are looking for
            // a global even when an AMD loader is in use.
            return (root.GrantUtilities = factory($, Dust));
        });
    } else {
        // Browser globals
        root.GranttUtilities = factory(root.jQuery, root.Dust);
    }
}(this, function ($, Dust) {
    "use strict";

    $.fn.gridify = function (options) {
        this.options = {
            colResizeZoneWidth: 10
        };

        $.extend(this.options, options);
        $.gridify.init($(this), this.options);
        return this;
    };

    $.gridify = {
        init: function (elems, opt) {
            elems.each(function () {
                var table = $(this);

                //----------------------  header management start
                table.find("th.gdfColHeader.gdfResizable:not(.gdfied)")
                .mouseover(function () {
                    $(this).addClass("gdfColHeaderOver");

                }).bind("mouseout.gdf", function () {
                    $(this).removeClass("gdfColHeaderOver");
                    if (!$.gridify.columInResize) {
                        $("body").removeClass("gdfHResizing");
                    }

                }).bind("mousemove.gdf", function (e) {
                    if (!$.gridify.columInResize) {
                        var colHeader = $(this),
                        mousePos = e.pageX - colHeader.offset().left;

                        if (colHeader.width() - mousePos < opt.colResizeZoneWidth) {
                            $("body").addClass("gdfHResizing");
                        } else {
                            $("body").removeClass("gdfHResizing");
                        }
                    }

                }).bind("mousedown.gdf", function (e) {
                    var colHeader = $(this),
                    mousePos = e.pageX - colHeader.offset().left;
                    if (colHeader.width() - mousePos < opt.colResizeZoneWidth) {
                        $.gridify.columInResize = $(this);
                        //bind event for start resizing
                        //console.debug("start resizing");
                        $(document).bind("mousemove.gdf", function (e) {
                            //manage resizing
                            //console.debug(e.pageX - $.gridify.columInResize.offset().left)
                            $.gridify.columInResize.width(e.pageX - $.gridify.columInResize.offset().left);


                            //bind mouse up on body to stop resizing
                        }).bind("mouseup.gdf", function () {
                            //console.debug("stop resizing");
                            $(this).unbind("mousemove.gdf").unbind("mouseup.gdf");
                            $("body").removeClass("gdfHResizing");
                            delete $.gridify.columInResize;
                        });
                    }
                }).addClass("gdfied unselectable").attr("unselectable", "true");


                //----------------------  cell management start wrapping
                table.find("td.gdfCell:not(.gdfied)").each(function () {
                    var wrp, inp, cell = $(this);
                    if (cell.is(".gdfEditable")) {
                        inp = $("<input type='text'>").addClass("gdfCellInput");
                        inp.val(cell.text());
                        cell.empty().append(inp);
                    } else {
                        wrp = $("<div>").addClass("gdfCellWrap");
                        wrp.html(cell.html());
                        cell.empty().append(wrp);
                    }
                }).addClass("gdfied");
            });
        }
    };

    $.splittify = {
        init: function (where, first, second, perc) {
            var w, splitter = $("<div>").addClass("splitterContainer"),
            firstBox = $("<div>").addClass("splitElement splitBox1"),
            splitterBar = $("<div>")
                .addClass("splitElement vSplitBar")
                .attr("unselectable", "on")
                .html("|").css("padding-top", where.height() / 2 + "px"),
            secondBox = $("<div>").addClass("splitElement splitBox2");

            perc = perc || 50;
            firstBox.append(first);
            secondBox.append(second);

            splitter.append(firstBox);
            splitter.append(secondBox);
            splitter.append(splitterBar);


            where.append(splitter);

            w = where.innerWidth();
            firstBox.width(w * perc / 100 - splitterBar.width())
                .css({
                    left: 0
                });
            splitterBar.css({
                left: firstBox.width()
            });
            secondBox
                .width(w - firstBox.width() - splitterBar.width())
                .css({
                    left: firstBox.width() + splitterBar.width()
                });


            splitterBar.bind("mousedown.gdf", function (e) {
                $.splittify.splitterBar = $(this);
                //bind event for start resizing
                //console.debug("start splitting");
                $("body").unselectable().bind("mousemove.gdf", function (e) {
                    //manage resizing
                    var sb = $.splittify.splitterBar,
                        pos = e.pageX - sb.parent().offset().left,
                        w = sb.parent().width();
                    if (pos > 10 && pos < w - 20) {
                        sb.css({
                            left: pos
                        });
                        firstBox.width(pos);
                        secondBox.css({
                            left: pos + sb.width(),
                            width: w - pos - sb.width()
                        });
                    }

                    //bind mouse up on body to stop resizing
                }).bind("mouseup.gdf", function () {
                    //console.debug("stop splitting");
                    $(this).unbind("mousemove.gdf").unbind("mouseup.gdf").clearUnselectable();
                    delete $.splittify.splitterBar;

                });
            });

            return {
                firstBox: firstBox,
                secondBox: secondBox,
                splitterBar: splitterBar
            };
        }
    };

    //This prototype is provided by the Mozilla foundation and
    //is distributed under the MIT license.
    //http://www.ibiblio.org/pub/Linux/LICENSES/mit.license

    if (!Array.prototype.filter) {
        Array.prototype.filter = function (fun) {
            var i, val, len = this.length,
                res = [],
                thisp = arguments[1];
            if (typeof fun !== "function") {
                throw new TypeError();
            }

            for (i = 0; i < len; i += 1) {
                if (i in this) {
                    val = this[i]; // in case fun mutates this
                    if (fun.call(thisp, val, i, this)) {
                        res.push(val);
                    }
                }
            }
            return res;
        };
    }

    //<%----  UTILITIES ---------------%>
    function computeStart(start) {
        var d = new Date(start + 3600000 * 12);
        d.setHours(0, 0, 0, 0);
        //move to next working day
        while (isHoliday(d)) {
            d.setDate(d.getDate() + 1);
        }
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }

    function computeEnd(end) {
        var d = new Date(end - 3600000 * 12);
        d.setHours(23, 59, 59, 999);
        //move to next working day
        while (isHoliday(d)) {
            d.setDate(d.getDate() + 1);
        }
        d.setHours(23, 59, 59, 999);
        return d.getTime();
    }

    function computeEndByDuration(start, duration) {
        var d = new Date(start),
            q = duration - 1;
        while (q > 0) {
            d.setDate(d.getDate() + 1);
            if (!isHoliday(d)) {
                q -= 1;
            }
        }
        d.setHours(23, 59, 59, 999);
        return d.getTime();
    }

    function incrementDateByWorkingDays(date, days) {
        var d = new Date(date);
        d.incrementDateByWorkingDays(days);
        return d.getTime();
    }

    function recomputeDuration(start, end) {
        //console.debug("recomputeDuration");
        return new Date(start).distanceInWorkingDays(new Date(end));
    }

    function injectCss(css, media, id) {
        var style = document.createElement('style');
        style.type = 'text/css';

        if (id) {
            $("#" + id).remove();
            style.id = id;
        }

        if (media) {
            style.media = media;
        }

        if (style.styleSheet) { // IE
            style.styleSheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }

        document.getElementsByTagName('head')[0].appendChild(style);
    }

    function renderTemplate(templateName, context, callback) {
        Dust.render(templateName, context, callback);
    }

    return {
        computeStart: computeStart,
        computeEnd: computeEnd,
        computeEndByDuration: computeEndByDuration,
        incrementDateByWorkingDays: incrementDateByWorkingDays,
        recomputeDuration: recomputeDuration,
        injectCss: injectCss,
        renderTemplate: renderTemplate
    };
}));

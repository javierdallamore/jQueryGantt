/*global window */
(function ($, undefined) {
    "use strict";
    $.fn.extend({
        everyTime: function (interval, label, fn, times, belay) {
            return this.each(function () {
                $.timer.add(this, interval, label, fn, times, belay);
            });
        },
        oneTime: function (interval, label, fn) {
            return this.each(function () {
                $.timer.add(this, interval, label, fn, 1);
            });
        },
        stopTime: function (label, fn) {
            return this.each(function () {
                $.timer.remove(this, label, fn);
            });
        }
    });

    $.extend({
        timer: {
            guid: 1,
            global: {},
            regex: /^([0-9]+)\s*(.*s)?$/,
            powers: {
                // Yeah this is major overkill...
                'ms': 1,
                'cs': 10,
                'ds': 100,
                's': 1000,
                'das': 10000,
                'hs': 100000,
                'ks': 1000000
            },
            timeParse: function (value) {
                if (value === undefined || value === null) {
                    return null;
                }
                var num, mult, result = this.regex.exec($.trim(value.toString()));
                if (result[2]) {
                    num = parseInt(result[1], 10);
                    mult = this.powers[result[2]] || 1;
                    return num * mult;
                } else {
                    return value;
                }
            },
            add: function (element, interval, label, fn, times, belay) {
                var handler, counter = 0;

                if ($.isFunction(label)) {
                    if (!times) {
                        times = fn;
                    }
                    fn = label;
                    label = interval;
                }

                interval = $.timer.timeParse(interval);

                if (typeof interval !== 'number' || isNaN(interval) || interval <= 0) {
                    return;
                }

                if (times && times.constructor !== Number) {
                    belay = !!times;
                    times = 0;
                }

                times = times || 0;
                belay = belay || false;

                if (!element.$timers) {
                    element.$timers = {};
                }

                if (!element.$timers[label]) {
                    element.$timers[label] = {};
                }

                if (fn.$timerID) {
                    fn.$timerID = fn.$timerID;
                } else {
                    fn.$timerID = this.guid;
                    this.guid += 1;
                }

                handler = function () {
                    if (belay && this.inProgress) {
                        return;
                    }
                    this.inProgress = true;
                    counter += 1;
                    if ((counter > times && times !== 0) || fn.call(element, counter) === false) {
                        $.timer.remove(element, label, fn);
                    }
                    this.inProgress = false;
                };

                handler.$timerID = fn.$timerID;

                if (!element.$timers[label][fn.$timerID]) {
                    element.$timers[label][fn.$timerID] = window.setInterval(handler, interval);
                }

                if (!this.global[label]) {
                    this.global[label] = [];
                }
                this.global[label].push(element);
            },
            remove: function (element, label, fn) {
                var timers = element.$timers, ret;

                if (timers) {

                    if (!label) {
                        for (label in timers) {
                            this.remove(element, label, fn);
                        }
                    } else if (timers[label]) {
                        if (fn) {
                            if (fn.$timerID) {
                                window.clearInterval(timers[label][fn.$timerID]);
                                delete timers[label][fn.$timerID];
                            }
                        } else {
                            for (fn in timers[label] ) {
                                window.clearInterval(timers[label][fn]);
                                delete timers[label][fn];
                            }
                        }

                        for (ret in timers[label] ) {
                            break;
                        }
                        if (!ret) {
                            ret = null;
                            delete timers[label];
                        }
                    }

                    for (ret in timers ) {
                        break;
                    }
                    if (!ret) {
                        element.$timers = null;
                    }
                }
            }
        }
    });

    if ($.browser && $.browser.msie) {
        $(window).one("unload", function () {
            var els, label, global = $.timer.global, i;
            for (label in global) {
                els = global[label];
                i = els.length;
                while (i) {
                    i -= 1;
                    $.timer.remove(els[i], label);
                }
            }
        });
    }
})(window.jQuery);


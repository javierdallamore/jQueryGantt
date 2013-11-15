/*global define, document*/
define(["jquery"], function ($) {
    "use strict";
    var obj = {};

    obj.load = function (path, id) {
        var
            head = document.getElementsByTagName('head')[0],
            attrs = {
                type: 'text/css',
                href: path,
                rel: 'stylesheet',
                media: 'screen'
            };

        if (id) {
            attrs.id = id;
        }

        $(document.createElement('link'))
            .attr(attrs)
            .appendTo(head);
    };

    obj.inject = function (css, media, id) {
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
    };

    obj.setStyle = function (id, path) {
        var style = $("#" + id);

        if (style.size() === 0) {
            obj.load(path, id);
        } else {
            style.attr({href: path});
        }
    };

    obj.setStyleContent = function (id, css, media) {
        var style = $("#" + id);

        media = media || "all";

        if (style.size() !== 0) {
            style.remove();
        }
        obj.inject(css, media, id);
    };

    return obj;
});

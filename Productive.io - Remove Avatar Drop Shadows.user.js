// ==UserScript==
// @name         Productive.io - Remove Avatar Drop Shadows
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Remove avatar drop shadows
// @icon         https://www.google.com/s2/favicons?sz=64&domain=productive.io
// @author       Bryan
// @match        *://app.productive.io/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // Define the CSS to be injected
    const css = `
    .activity-item__person-avatar{
        --shadow-background-image: none;
    }
    `;

    // Inject the CSS into the page
    GM_addStyle(css);
})();
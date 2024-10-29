// ==UserScript==
// @name         Productive.io - Private Comment Visibility Toggle
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Toggle visibility of hidden comments on Productive task pages
// @match        https://app.productive.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=productive.io
// @grant        GM.getValue
// @grant        GM.setValue
// ==/UserScript==

(function() {
    'use strict';

    // Inject CSS for the floating button and comment hiding
    const style = document.createElement('style');
    style.textContent = `
        .fst-floating-toggle {
            position: fixed;
            z-index: 11;
            padding: 0 !important;
            margin: 0 !important;
            border: none;
            bottom: 78px;
            right: 20px;
            max-width: 48px;
            width: 48px;
            max-height: 48px;
            height: 48px;
            border-radius: 50%;
            color: #ffffff;
            background: #5D2BFF;
            cursor: pointer;
            box-shadow: 0 1px 6px 0 rgba(0, 0, 0, 0.06), 0 2px 32px 0 rgba(0, 0, 0, 0.16);
            transition: transform 167ms cubic-bezier(0.33, 0.00, 0.00, 1.00);
            box-sizing: content-box;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .fst-floating-toggle:hover {
            transition: transform 250ms cubic-bezier(0.33, 0.00, 0.00, 1.00);
            transform: scale(1.1);
        }
        .fst-floating-toggle svg {
            width: 100%;
            height: auto;
            scale: 60%;
        }
        .fst-floating-toggle.active svg {
            opacity: 0.25;
        }
        .fst-hide-comments .activity-item:has(.activity-item__comment-header-hidden-tag) + .activity-container__divider,
        .fst-hide-comments .activity-item:has(.activity-item__comment-header-hidden-tag) {
           display: none !important;
        }
    `;
    document.head.appendChild(style);

    // SVG Icon markup
    const svgMarkup = `
        <svg xmlns="http://www.w3.org/2000/svg" height="26px" width="26px" viewBox="0 0 512 512">
            <path fill="currentColor" d="M123.6 391.3c12.9-9.4 29.6-11.8 44.6-6.4c26.5 9.6 56.2 15.1 87.8 15.1c124.7 0 208-80.5 208-160s-83.3-160-208-160S48 160.5 48 240c0 32 12.4 62.8 35.7 89.2c8.6 9.7 12.8 22.5 11.8 35.5c-1.4 18.1-5.7 34.7-11.3 49.4c17-7.9 31.1-16.7 39.4-22.7zM21.2 431.9c1.8-2.7 3.5-5.4 5.1-8.1c10-16.6 19.5-38.4 21.4-62.9C17.7 326.8 0 285.1 0 240C0 125.1 114.6 32 256 32s256 93.1 256 208s-114.6 208-256 208c-37.1 0-72.3-6.4-104.1-17.9c-11.9 8.7-31.3 20.6-54.3 30.6c-15.1 6.6-32.3 12.6-50.1 16.1c-.8 .2-1.6 .3-2.4 .5c-4.4 .8-8.7 1.5-13.2 1.9c-.2 0-.5 .1-.7 .1c-5.1 .5-10.2 .8-15.3 .8c-6.5 0-12.3-3.9-14.8-9.9c-2.5-6-1.1-12.8 3.4-17.4c4.1-4.2 7.8-8.7 11.3-13.5c1.7-2.3 3.3-4.6 4.8-6.9c.1-.2 .2-.3 .3-.5z"/>
        </svg>
    `;

    const parseSvgString = svgString => new DOMParser().parseFromString(svgString, 'image/svg+xml').querySelector('svg');
    const floatingTab = document.createElement('div');
    floatingTab.classList.add('fst-floating-toggle');
    floatingTab.appendChild(parseSvgString(svgMarkup));

    let hiddenCommentsAreVisible = true;
    let intervalId = 0;

    // Load stored visibility state
    GM.getValue("hiddenCommentsAreVisible", true).then((result) => {
        hiddenCommentsAreVisible = result;
        if (!hiddenCommentsAreVisible) floatingTab.classList.add('active');
        document.body.appendChild(floatingTab);

        floatingTab.addEventListener('click', () => {
            hiddenCommentsAreVisible = !hiddenCommentsAreVisible;
            updateState();
            GM.setValue("hiddenCommentsAreVisible", hiddenCommentsAreVisible);
        });

        function updateCommentVisibility() {
            if (hiddenCommentsAreVisible) {
                document.body.classList.remove('fst-hide-comments');
            } else {
                document.body.classList.add('fst-hide-comments');
                clearInterval(intervalId);
                intervalId = 0;
            }
        }

        function updateState() {
            if (!hiddenCommentsAreVisible) {
                floatingTab.classList.add('active');
                intervalId = setInterval(updateCommentVisibility, 500);
            } else {
                clearInterval(intervalId);
                intervalId = 0;
                floatingTab.classList.remove('active');
            }
            updateCommentVisibility();
        }

        updateState();
    });
})();
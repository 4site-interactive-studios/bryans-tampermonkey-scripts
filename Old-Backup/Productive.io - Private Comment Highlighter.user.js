// ==UserScript==
// @name         Productive.io - Private Comment Highlighter
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Highlight private comments on Productive.io with custom CSS and add [data-hide] to specific dividers.
// @icon         https://www.google.com/s2/favicons?sz=64&domain=productive.io
// @author       Bryan
// @match        *://app.productive.io/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // Define the CSS to be injected
    const css = `
    .activity-item.js-activity-container-item:has([data-theme="yellow"]) .activity-item__content {
        outline-offset: 5px;
        background-color: hwb(44deg 80% 0% / 20%);
        padding: 1ch;
        margin: -1ch;
        border-radius: 4px;
        border: 1px solid hwb(43deg 6% 66% / 20%);
    }

    .activity-item.js-activity-container-item [data-theme="yellow"]{
        padding-bottom: 0;
        padding-left: 0;
    }

    .activity-item.js-activity-container-item [data-theme="yellow"] svg{
        position: relative;
        top: -1px;
    }

    .activity-item.js-activity-container-item:has([data-theme="yellow"]) + .activity-container__divider{
        height: 0px;
        margin-bottom: 0px;
    }

    [data-hide]{
        display: none;
    }
    `;

    // Inject the CSS into the page
    GM_addStyle(css);

    // Function to check and add the [data-hide] attribute
    function hideYellowActivityDividers() {
        document.querySelectorAll('.activity-container__divider').forEach(divider => {
            const nextItem = divider.nextElementSibling;

            // Check if the next item has the required classes and contains an element with [data-theme="yellow"]
            if (
                nextItem &&
                nextItem.classList.contains('activity-item') &&
                nextItem.classList.contains('js-activity-container-item') &&
                nextItem.querySelector('[data-theme="yellow"]')
            ) {
                divider.setAttribute('data-hide', '');
            }
        });
    }

    // Run the function once initially to handle any existing content
    hideYellowActivityDividers();

    // Set up a MutationObserver to watch for changes to the page content
    const observer = new MutationObserver(() => {
        hideYellowActivityDividers();
    });

    // Observe changes in the body element and its subtree
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
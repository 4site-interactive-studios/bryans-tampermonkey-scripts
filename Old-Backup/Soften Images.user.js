// ==UserScript==
// @name         Soften Images (Option + H)
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  Dynamically soften images and background images on page load and for dynamically added elements, with Option + H toggle. Works across subdomains of a TLD and syncs across tabs/windows.
// @author       Bryan Casler
// @match        *://*/*
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.listValues
// @grant        GM.deleteValue
// @grant        GM.addValueChangeListener
// ==/UserScript==

(function () {
    'use strict';

    const TOGGLE_KEY = { altKey: true, code: "KeyH" };
    const STORAGE_KEY = `softenEffect_${getDomain()}`; // Key for storing preference per TLD
    let styleElement = null;
    let observer = null;

    // Debugging flag based on URL parameter
    const isDebugMode = window.location.search.includes('debug=true');

    const log = (...args) => {
        if (isDebugMode) console.log(...args);
    };

    // CSS styles for softening
    const STYLE_CONTENT = `
        *:before, *:after, img, picture, video, [src*='youtube' i], [src*='vimeo' i],
        [style*='background: url' i], [style*='background-image' i],
        [class~='background' i], [class~='backgroundimage' i],
        [class~='background-image' i], [class~='background_image' i],
        [class~='bgimage' i], [class~='bg-image' i], [class~='bg_image' i] {
            filter: blur(10px) grayscale(100%) !important;
            opacity: 0.5 !important;
            transition-duration: 0s !important;
            transition-timing-function: ease-in !important;
        }
        html *:before:hover, html *:after:hover, html img:hover, html picture:hover,
        html video:hover, html [src*='youtube' i]:hover, html [src*='vimeo' i]:hover,
        html [style*='background: url' i]:hover, html [style*='background-image' i]:hover,
        html [class~='background' i]:hover, html [class~='backgroundimage' i]:hover,
        html [class~='background-image' i]:hover, html [class~='background_image' i]:hover,
        html [class~='bgimage' i]:hover, html [class~='bg-image' i]:hover,
        html [class~='bg_image' i]:hover {
            filter: blur(0px) grayscale(0%) !important;
            opacity: 1 !important;
            transition-duration: 4s !important;
        }
    `;

    function getDomain() {
        const host = window.location.hostname;
        const parts = host.split('.');

        // Return the TLD + second-level domain (e.g., "example.com")
        if (parts.length > 2) {
            return parts.slice(-2).join('.');
        }
        return host; // Return the hostname if it's already top-level
    }

    function applyStyleElement() {
        if (!styleElement) {
            styleElement = document.createElement("style");
            styleElement.textContent = STYLE_CONTENT;
            document.head.appendChild(styleElement);
            log("Style element applied");
        }
    }

    function removeStyleElement() {
        if (styleElement) {
            styleElement.remove();
            styleElement = null;
            log("Style element removed");
        }
    }

    function observeDynamicContent() {
        observer = new MutationObserver(() => {
            log("DOM mutation detected, ensuring styles are applied");
        });

        observer.observe(document.body, { childList: true, subtree: true });
        log("MutationObserver initialized");
    }

    async function toggleEffect() {
        const isStored = await GM.getValue(STORAGE_KEY);

        if (isStored) {
            removeStyleElement();
            if (observer) observer.disconnect();
            await GM.deleteValue(STORAGE_KEY);
            log(`Effect removed for TLD: ${STORAGE_KEY}`);
        } else {
            applyStyleElement();
            observeDynamicContent();
            await GM.setValue(STORAGE_KEY, true);
            log(`Effect applied and saved for TLD: ${STORAGE_KEY}`);
        }
    }

    async function checkAndApplyEffect() {
        const isStored = await GM.getValue(STORAGE_KEY);
        if (isStored) {
            log(`Preference found for TLD ${STORAGE_KEY}: Applying effect`);
            applyStyleElement();
            observeDynamicContent();
        } else {
            log(`No preference found for TLD ${STORAGE_KEY}`);
        }
    }

    function setupCrossTabListener() {
        GM.addValueChangeListener(STORAGE_KEY, (key, oldValue, newValue, remote) => {
            if (remote) {
                log(`Cross-tab update detected for ${key}:`, newValue);
                if (newValue) {
                    applyStyleElement();
                    observeDynamicContent();
                } else {
                    removeStyleElement();
                    if (observer) observer.disconnect();
                }
            }
        });
        log("Cross-tab listener initialized");
    }

    window.addEventListener("keydown", (event) => {
        log("Key pressed:", event.code, event.altKey);
        if (event.altKey === TOGGLE_KEY.altKey && event.code === TOGGLE_KEY.code) {
            log("Option+H detected");
            toggleEffect();
        }
    });

    checkAndApplyEffect();
    setupCrossTabListener();
})();
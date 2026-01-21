// ==UserScript==
// @name         HubSpot Tracking is Off Highlighter
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Highlights HubSpot icon "sprocket-off.png" which indicates tracking is off
// @author       You
// @match        https://mail.google.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Function to apply styles to matching images
    function highlightSprocketImages() {
        const images = document.querySelectorAll('img[src*="sprocket-off.png"]');

        images.forEach(img => {
            // Check if we've already styled this image to avoid re-applying
            if (!img.hasAttribute('data-sprocket-highlighted')) {
                img.style.outline = '15px solid red';
                img.style.borderRadius = '100%';
                img.style.outlineOffset = '3px';
                img.setAttribute('data-sprocket-highlighted', 'true');
            }
        });
    }

    // Initial check when page loads
    highlightSprocketImages();

    // Use MutationObserver to watch for dynamically loaded content
    // Gmail loads emails dynamically, so we need to watch for changes
    const observer = new MutationObserver(function(mutations) {
        highlightSprocketImages();
    });

    // Start observing the document body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Also run periodically as a fallback (every 2 seconds)
    setInterval(highlightSprocketImages, 2000);
})();
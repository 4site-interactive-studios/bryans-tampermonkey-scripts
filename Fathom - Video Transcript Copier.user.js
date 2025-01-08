// ==UserScript==
// @name         Fathom Video Transcript Copier
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  Add "Copy as Plaintext" button dynamically and remove it if the native button appears or the transcript is hidden (with 3-second delay and active monitoring)
// @author       Bryan
// @match        https://fathom.video/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Enable debug logging if "debug=true" is in the URL
    const debug = new URLSearchParams(window.location.search).get('debug') === 'true';

    // Debug log helper
    function debugLog(...args) {
        if (debug) console.log('[DEBUG]', ...args);
    }

    // Function to check if the native "Copy Transcript" button is present
    function isNativeCopyButtonPresent() {
        const nativeButton = document.querySelector(
            'page-call-detail-player-sub-nav .flex.flex-row.my-auto.ml-auto.spacing-x-1 > button:not([data-plaintext-button]) > span'
        );
        const isPresent = !!nativeButton;
        debugLog('isNativeCopyButtonPresent:', isPresent, nativeButton);
        return isPresent;
    }

    // Function to check if the transcript is hidden
    function isTranscriptHidden() {
        const transcriptElement = document.querySelector('page-call-detail-transcript');
        const isHidden = transcriptElement && transcriptElement.hasAttribute('hidden');
        debugLog('isTranscriptHidden:', isHidden, transcriptElement);
        return isHidden;
    }

    // Function to add the "Copy as Plaintext" button
    function addCopyButton() {
        const subNavDiv = document.querySelector('page-call-detail-player-sub-nav > div > div');
        if (!subNavDiv) {
            debugLog('addCopyButton: <page-call-detail-player-sub-nav> > div > div not found');
            return;
        }

        // Ensure the button isn't already added
        if (document.querySelector('button[data-plaintext-button]')) {
            debugLog('addCopyButton: Button already exists');
            return;
        }

        // Create the Copy as Plaintext button
        const copyButton = document.createElement('button');
        copyButton.className =
            'copy-as-plaintext-btn flex items-center justify-between normal-case p-1 pl-2 text-base pr-2 font-bold whitespace-no-wrap rounded-md bg-opacity-10 text-link bg-link hover:text-surface-base hover:bg-link cursor-pointer';
        copyButton.setAttribute('data-plaintext-button', 'true');
        copyButton.textContent = 'Copy as Plaintext';

        copyButton.addEventListener('click', copyTranscript);
        subNavDiv.appendChild(copyButton);
        debugLog('addCopyButton: "Copy as Plaintext" button added');
    }

    // Function to remove the "Copy as Plaintext" button
    function removeCopyButton() {
        const copyButton = document.querySelector('button[data-plaintext-button]');
        if (copyButton) {
            copyButton.remove();
            debugLog('removeCopyButton: "Copy as Plaintext" button removed');
        }
    }

    // Function to copy the transcript
    function copyTranscript() {
        const transcriptContainer = document.querySelector(
            'page-call-detail-transcript div.pb-3.sm\\:pb-6.spacing-y-3'
        );

        if (transcriptContainer) {
            const figures = transcriptContainer.querySelectorAll('figure');
            let transcriptText = '';

            figures.forEach((figure) => {
                const speaker = figure.querySelector('cite')?.textContent || 'Unknown Speaker';
                const text = figure.querySelector('blockquote p')?.textContent || '';
                transcriptText += `${speaker}: ${text}\n\n`;
            });

            navigator.clipboard.writeText(transcriptText).then(() => {
                alert('Transcript copied to clipboard!');
                debugLog('copyTranscript: Transcript copied successfully');
            });
        } else {
            alert('Transcript not found!');
            debugLog('copyTranscript: Transcript not found');
        }
    }

    // Function to handle the button state based on the presence of the native button and transcript visibility
    function handleButtonState() {
        if (isTranscriptHidden()) {
            debugLog('handleButtonState: Transcript is hidden, removing our button');
            removeCopyButton(); // Remove our button if the transcript is hidden
            return;
        }

        if (isNativeCopyButtonPresent()) {
            debugLog('handleButtonState: Native button detected, removing our button');
            removeCopyButton(); // Remove our button if the native button is present
        } else {
            debugLog('handleButtonState: Native button not detected, adding our button');
            addCopyButton(); // Add our button if the native button is absent and the transcript is not hidden
        }
    }

    // Set up a MutationObserver to monitor changes in the parent container and transcript visibility
    function observeNativeButtonAndTranscript() {
        const targetNode = document.querySelector('page-call-detail-player-sub-nav');
        const transcriptNode = document.querySelector('page-call-detail-transcript');

        if (!targetNode || !transcriptNode) {
            debugLog('observeNativeButtonAndTranscript: Target nodes not found');
            return;
        }

        const observer = new MutationObserver(() => {
            debugLog('observeNativeButtonAndTranscript: DOM mutation detected');
            handleButtonState(); // Re-check button state on each mutation
        });

        observer.observe(targetNode, {
            childList: true,
            subtree: true,
        });

        observer.observe(transcriptNode, {
            attributes: true,
            attributeFilter: ['hidden'],
        });

        debugLog('observeNativeButtonAndTranscript: MutationObserver started');
    }

    // Initial check and start observing after a 3-second delay
    function initialize() {
        debugLog('initialize: Starting script after 3-second delay');
        handleButtonState(); // Initial button state check
        observeNativeButtonAndTranscript(); // Start observing for dynamic changes
    }

    // Wait for the page to fully load and then delay initialization by 3 seconds
    window.onload = () => {
        setTimeout(initialize, 3000);
    };
})();
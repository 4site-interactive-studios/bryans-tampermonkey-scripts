// ==UserScript==
// @name         4sitestudios.com - Capacity Report Password Memory
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Saves and reuses entered password locally, auto-submits on return
// @match        https://www.4sitestudios.com/capacity/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=4sitestudios.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'capacity_saved_password';

    const passwordInput = document.querySelector('input[name="post_password"]');
    const form = passwordInput?.closest('form');

    if (!passwordInput || !form) return;

    const savedPassword = localStorage.getItem(STORAGE_KEY);

    // If we already have a saved password, auto-fill and submit
    if (savedPassword) {
        passwordInput.value = savedPassword;
        form.submit();
        return;
    }

    // Otherwise, wait for the user to submit and store it
    form.addEventListener('submit', () => {
        const enteredPassword = passwordInput.value;
        if (enteredPassword) {
            localStorage.setItem(STORAGE_KEY, enteredPassword);
        }
    });
})();

// ==UserScript==
// @name         EN - Automatic Login Redirect and UI Update
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  Redirects between Engaging Networks login servers (ca and us), securely passing credentials, auto-filling fields, submitting forms with a delay, and updating navigation UI.
// @author       Bryan
// @match        https://ca.engagingnetworks.app/index.html*
// @match        https://us.engagingnetworks.app/index.html*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

/*
Functionality Summary:
1. Error Overlay Monitoring:
   - Monitors `div.messageOverlay.error` for changes to its `style` attribute.
   - Triggers a redirect to the alternate domain if `display: none` is detected.

2. URL Mapping for Redirection:
   - Uses a `urls` object to map each domain to its alternate.

3. Secure Passing of Credentials:
   - Encrypts username and password using Base64 and passes them as query parameters during redirection.

4. Dynamic Element Detection:
   - Uses a universal `MutationObserver` to handle cases where required elements are dynamically added to the DOM.

5. Field Repopulation and Submission:
   - Automatically fills the username and password fields on the redirected page.
   - Focuses on the password field after repopulating.
   - Delays form submission by 1 second for better UX.

6. URL Cleanup:
   - Removes sensitive query parameters (`redirected`, `user`, `pass`) after repopulating fields.

7. Navigation UI Update:
   - Updates `.enLayout__nav--secondary > li > a` with user and account information extracted from `.enLayout__navItem--text`.
*/

(function () {
    'use strict';

    // Debugging toggle
    const DEBUG = true;
    const debugLog = (...args) => { if (DEBUG) console.log(...args); };

    // Constants for selectors
    const SELECTORS = {
        errorOverlay: "div.messageOverlay.error",
        usernameInput: "#enLoginUsername",
        passwordInput: "#enLoginPassword",
        loginButton: ".enLogin__action button",
        userInfo: ".enLayout__navItem--text",
        navLink: ".enLayout__nav--secondary > li > a"
    };

    // URL mapping for redirection
    const urls = {
        "https://ca.engagingnetworks.app/index.html": "https://us.engagingnetworks.app/index.html",
        "https://us.engagingnetworks.app/index.html": "https://ca.engagingnetworks.app/index.html"
    };

    // Helper: Base64 decryption with error handling
    const decrypt = (text) => {
        try {
            return atob(text);
        } catch (error) {
            console.error("Failed to decode Base64 text:", text);
            return null;
        }
    };

    // Helper: Remove specified URL parameters
    const removeUrlParams = (params) => {
        const url = new URL(window.location.href);
        params.forEach((param) => url.searchParams.delete(param));
        history.replaceState(null, "", url.toString());
        debugLog("URL arguments removed.");
    };

    // Helper: Observe for dynamic element additions
    const observeElement = (selector, callback) => {
        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                callback(element);
                observer.disconnect(); // Stop observing once found
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    };

    // Monitor error overlay for display:none
    const monitorErrorOverlay = () => {
        observeElement(SELECTORS.errorOverlay, (overlay) => {
            debugLog("Error overlay found. Monitoring for style changes...");
            new MutationObserver(() => {
                if (overlay.style.display === "none") {
                    debugLog("Error overlay hidden. Preparing to redirect...");
                    handleRedirect();
                }
            }).observe(overlay, { attributes: true, attributeFilter: ["style"] });
        });
    };

    // Update navigation UI with user and account info
    const updateNavigationWithUserInfo = () => {
        observeElement(SELECTORS.userInfo, (userInfoElement) => {
            const navLink = document.querySelector(SELECTORS.navLink);
            if (navLink) {
                const lines = userInfoElement.innerHTML.split(/<br\s*\/?>/i).map(line => line.trim());
                const user = lines.find(line => line.startsWith("User:"))?.replace("User:", "").trim() || null;
                const account = lines.find(line => line.startsWith("Account:"))?.replace("Account:", "").trim() || null;

                if (user && account) {
                    navLink.textContent = `${user} @ ${account}`;
                    debugLog(`Navigation updated: ${user} @ ${account}`);
                } else {
                    console.warn("User or Account missing in user info element. Skipping navigation update.");
                }
            }
        });
    };

    const normalizeUrl = (url) => url.split("#")[0].replace(/\/+$/, ""); // Remove fragment and trailing slashes

    const handleRedirect = () => {
        const currentUrl = normalizeUrl(window.location.href);
        debugLog(`Normalized Current URL: ${currentUrl}`);
        debugLog("Available URLs for mapping:", Object.keys(urls));

        const redirectUrl = urls[currentUrl];
        debugLog("Redirect URL determined:", redirectUrl);

        if (redirectUrl) {
            debugLog(`Redirecting to: ${redirectUrl}`);
            const username = document.querySelector(SELECTORS.usernameInput)?.value || "unknown";
            const password = document.querySelector(SELECTORS.passwordInput)?.value || "unknown";
            window.location.href = `${redirectUrl}?redirected=true&user=${encodeURIComponent(btoa(username))}&pass=${encodeURIComponent(btoa(password))}`;
        } else {
            console.error("Redirection failed: No mapping found for the current URL.");
            alert("Unable to determine the correct redirection URL. Please check your login credentials.");
        }
    };

    // Handle field repopulation and form submission
    const handleRedirectAndSubmit = () => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("redirected") === "true") {
            debugLog("Detected redirect. Attempting to repopulate fields...");
            const encryptedUsername = urlParams.get("user");
            const encryptedPassword = urlParams.get("pass");

            if (encryptedUsername && encryptedPassword) {
                const username = decrypt(encryptedUsername);
                const password = decrypt(encryptedPassword);

                if (username && password) {
                    observeElement(SELECTORS.usernameInput, (usernameInput) => {
                        const passwordInput = document.querySelector(SELECTORS.passwordInput);
                        const loginButton = document.querySelector(SELECTORS.loginButton);

                        if (usernameInput && passwordInput && loginButton) {
                            debugLog("Login fields and button detected. Populating values...");
                            usernameInput.value = username;
                            passwordInput.value = password;
                            passwordInput.focus();

                            // Clean up the URL and submit the form with a delay
                            removeUrlParams(["redirected", "user", "pass"]);
                            setTimeout(() => {
                                debugLog("Clicking login button to submit the form...");
                                loginButton.click();
                            }, 1000);
                        }
                    });
                } else {
                    console.warn("Failed to decode credentials. Skipping repopulation.");
                }
            } else {
                console.warn("Encrypted credentials not found in URL. Skipping repopulation.");
            }
        }
    };

    // Initialize all functionalities
    const initialize = () => {
        debugLog("Initializing script...");
        monitorErrorOverlay();
        updateNavigationWithUserInfo();
        handleRedirectAndSubmit();
    };

    initialize();
})();
// ==UserScript==
// @name         drugpolicy.org - New Userscript
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  try to take over the world!
// @author       You
// @match        https://engage.drugpolicy.org/secure/donate?gtm_debug=1732137937349
// @icon         https://www.google.com/s2/favicons?sz=64&domain=drugpolicy.org
// @grant        none
// ==/UserScript==

(function () {
  // Enable debugging if "debug" or "gtm_debug" is in the URL
  var enableDebug =
    location.search.includes("debug") || location.search.includes("gtm_debug");

  /**
   * Logs debug messages if debugging is enabled.
   * @param {string} message - The message to log.
   */
  function debugLog(message) {
    if (enableDebug) {
      console.log(message);
    }
  }

  /**
   * Sanitizes an input value, removing any characters except digits, periods, and commas.
   * @param {string} value - The input value to sanitize.
   * @returns {string} - The sanitized value.
   */
  function sanitizeAmount(value) {
    return value.replace(/[^\d.,]/g, ""); // Keep only digits, periods, and commas
  }

  /**
   * Identifies the currently visible donation form by checking the display property.
   * @returns {HTMLElement|null} - The visible form element or null if none are visible.
   */
  function getVisibleDonationForm() {
    var forms = document.querySelectorAll(
      "#webform-component-donation--amount, #webform-component-donation--recurring-amount"
    );
    for (var i = 0; i < forms.length; i++) {
      if (getComputedStyle(forms[i]).display !== "none") {
        debugLog("Visible form: " + forms[i].id);
        return forms[i];
      }
    }
    return null;
  }

  /**
   * Calculates and pushes the donation amount to the GTM dataLayer.
   */
  function logAndPushDonationAmount() {
    debugLog("Calculating donation amount...");
    var visibleForm = getVisibleDonationForm();
    if (!visibleForm) {
      debugLog("No visible donation form found.");
      return;
    }

    // Find the selected radio button and its associated "Other" input field
    var selectedRadio = visibleForm.querySelector(
      'input[type="radio"]:checked'
    );
    var otherAmountField = visibleForm.querySelector('input[type="text"]'); // Scoped to the visible form
    var processingFeeCheckbox = document.querySelector(
      "#edit-submitted-payment-information-processing-fee-1"
    );

    var amount = null;

    // Determine the donation amount
    if (selectedRadio) {
      debugLog("Selected radio value: " + selectedRadio.value);
      if (selectedRadio.value === "other" && otherAmountField) {
        var sanitizedValue = sanitizeAmount(otherAmountField.value);
        debugLog("Sanitized 'Other' field value: " + sanitizedValue);
        if (sanitizedValue) {
          amount = parseFloat(sanitizedValue.replace(",", ".")); // Convert to a numeric value
        }
      } else {
        amount = parseFloat(selectedRadio.value);
      }
    } else {
      debugLog("No radio button is selected.");
    }

    // Add processing fee if applicable
    if (amount && processingFeeCheckbox && processingFeeCheckbox.checked) {
      debugLog("Processing fee checkbox is selected. Adding 3% to the amount.");
      amount = amount + amount * 0.03;
    }

    // Push the final donation amount to the dataLayer
    if (amount) {
      amount = amount.toFixed(2); // Ensure two decimal places
      debugLog("Final calculated amount: " + amount);
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ donationAmount: amount });
      if (enableDebug) {
        console.log(amount); // Log the final amount
      }
    } else {
      debugLog("Invalid or unset donation amount.");
    }
  }

  /**
   * Sets up event listeners for monitoring changes in the donation form.
   */
  function setupListeners() {
    debugLog("Setting up listeners...");
    var observerTarget = document.querySelector("#webform-component-donation");

    // MutationObserver to detect visibility changes
    var observer = new MutationObserver(function (mutationsList) {
      for (var i = 0; i < mutationsList.length; i++) {
        if (mutationsList[i].attributeName === "style") {
          debugLog(
            "Visibility change detected. Recalculating donation amount..."
          );
          logAndPushDonationAmount();
        }
      }
    });

    // Observe style changes on the donation form container
    if (observerTarget) {
      observer.observe(observerTarget, { attributes: true, subtree: true });
    }

    // Add event listeners to all radio buttons
    var radios = document.querySelectorAll('input[type="radio"]');
    for (var i = 0; i < radios.length; i++) {
      radios[i].addEventListener("change", logAndPushDonationAmount);
    }

    // Add event listeners to all "Other" input fields
    var otherFields = document.querySelectorAll('input[type="text"]');
    for (var j = 0; j < otherFields.length; j++) {
      otherFields[j].addEventListener("input", logAndPushDonationAmount);
    }

    // Add event listener to the processing fee checkbox
    var processingFeeCheckbox = document.querySelector(
      "#edit-submitted-payment-information-processing-fee-1"
    );
    if (processingFeeCheckbox) {
      processingFeeCheckbox.addEventListener(
        "change",
        logAndPushDonationAmount
      );
    }

    // Perform an initial calculation and push
    logAndPushDonationAmount();
  }

  // Initialize listeners on DOMContentLoaded or immediately if the DOM is already ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupListeners);
  } else {
    setupListeners();
  }
})();

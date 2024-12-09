// ==UserScript==
// @name         ENgrid - Populate 18 Semantic Sections into Advanced Row
// @namespace    http://tampermonkey.net/
// @version      1.12
// @description  Adds a button to populate ENgrid's 18 Semantic Sections in Engaging Networks
// @match        https://ca.engagingnetworks.app/*
// @match        https://us.engagingnetworks.app/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=engagingnetworks.net
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // List of classes to be assigned in order to each input
    const classNames = [
        'page-alert',
        'content-header',
        'body-headerOutside',
        'body-header',
        'body-title',
        'body-banner',
        'body-bannerOverlay',
        'body-top',
        'body-main',
        'body-bottom',
        'body-footer',
        'body-footerOutside',
        'content-footerSpacer',
        'content-preFooter',
        'content-footer',
        'page-backgroundImage',
        'page-backgroundImageOverlay',
        'page-customCode'
    ];

    // Function to check for the header and add the button
    function checkAndAddButton() {
        const header = document.querySelector('h2.enOverlay__popup__title');

        // Check if header exists and contains "Advanced Row" (ignoring whitespace)
        if (header && header.textContent.replace(/\s+/g, '') === 'AdvancedRow') {
            let button = document.querySelector('#customActionButton');

            // Create the button if it doesn’t already exist
            if (!button) {
                button = document.createElement('button');
                button.id = 'customActionButton';
                button.type = 'button';
                button.innerText = "Populate ENgrid's 18 Semantic Sections";
                button.style.marginTop = '10px';

                // Add custom styles for the disabled state
                const style = document.createElement('style');
                style.innerHTML = `
                    #customActionButton:disabled {
                        background-color: light-dark(rgba(239, 239, 239, 0.3), rgba(19, 1, 1, 0.3));
                        color: light-dark(rgba(16, 16, 16, 0.3), rgba(255, 255, 255, 0.3));
                        border-color: light-dark(rgba(118, 118, 118, 0.3), rgba(195, 195, 195, 0.3));
                    }
                `;
                document.head.appendChild(style);

                // Add click event to perform actions
                button.addEventListener('click', async () => {
                    // Disable button during execution to prevent double clicks
                    button.disabled = true;
                    await clickAddButton16Times();
                    await populateInputsWithClasses();
                    await clickBackToColumn0();

                    // Recheck if there are now 18 sections; keep button disabled if so
                    const lastSection = document.querySelector('a[data-column="17"]');
                    if (lastSection) {
                        button.disabled = true;
                    } else {
                        button.disabled = false;
                    }
                });

                // Append the button after the header
                header.parentNode.insertBefore(button, header.nextSibling);
            }

            // Enable or disable button based on whether 18 sections are present
            const lastSection = document.querySelector('a[data-column="17"]');
            button.disabled = !!lastSection; // Disable if 18 sections exist, enable otherwise
        }
    }

    // Function to click the add button 16 times with a 0ms delay between clicks
    async function clickAddButton16Times() {
        const addButton = document.querySelector('a.pboAdvancedRow__tab--add');
        if (addButton) {
            for (let i = 0; i < 16; i++) {
                addButton.click();
                await new Promise(resolve => setTimeout(resolve, 0)); // 0ms delay between clicks
            }
        }
    }

    // Function to populate each input with corresponding class from the list
    async function populateInputsWithClasses() {
        for (let i = 0; i < classNames.length; i++) {
            await populateInput(i, classNames[i]);
        }
    }

    // Function to populate a specific input with the corresponding class name
    async function populateInput(columnIndex, className) {
        const columnTab = document.querySelector(`a[data-column="${columnIndex}"]`);

        if (columnTab) {
            // Click the tab to ensure it's the active element
            columnTab.click();
            await new Promise(resolve => setTimeout(resolve, 50)); // Wait for the tab to become active

            // Look for elements within .pboAdvancedRow__columns after selecting the tab
            const columnsContainer = document.querySelector('.pboAdvancedRow__columns');
            if (columnsContainer) {
                // Find and check the checkbox if it’s inside .pboAdvancedRow__columns and unchecked
                const checkbox = columnsContainer.querySelector('.componentStyle__style__enabled input[type="checkbox"]');
                if (checkbox && !checkbox.checked) {
                    checkbox.checked = true;
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }

                // Wait 50ms before filling the text input inside .pboAdvancedRow__columns
                await new Promise(resolve => setTimeout(resolve, 50));

                const textInput = columnsContainer.querySelector('input[type="text"].pbo__input__text');
                if (textInput) {
                    textInput.value = className;
                    textInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        }
    }

    // Function to click back to data-column="0" after all inputs are populated
    async function clickBackToColumn0() {
        const firstTab = document.querySelector('a[data-column="0"]');
        if (firstTab) {
            await new Promise(resolve => setTimeout(resolve, 50)); // Wait a moment before clicking back
            firstTab.click();
        }
    }

    // Observe DOM changes to dynamically check for the header
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(() => {
            checkAndAddButton();
        });
    });

    // Start observing the body for added nodes or attribute changes
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial check in case elements are already loaded
    checkAndAddButton();

})();
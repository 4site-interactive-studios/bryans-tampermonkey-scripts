// ==UserScript==
// @name         Productive.io - Calendar Task Time Logger
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds a clickable element to tasks in calendar view that logs remaining estimated time on the due date using the first "Strategy" service
// @author       Bryan
// @match        https://app.productive.io/*
// @icon         https://app.productive.io/favicon.ico
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  "use strict";

  // Debug mode - add ?debug=true to URL to enable
  const DEBUG = new URLSearchParams(window.location.search).has("debug");
  const log = (...args) => DEBUG && console.log("[Calendar Time Logger]", ...args);

  // CSS for the log button
  const css = `
    .calendar-time-log-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 4px;
      background: #10b981;
      color: white;
      font-size: 11px;
      font-weight: bold;
      cursor: pointer;
      margin-left: 4px;
      opacity: 0.7;
      transition: opacity 0.2s, transform 0.2s;
      flex-shrink: 0;
    }
    .calendar-time-log-btn:hover {
      opacity: 1;
      transform: scale(1.1);
    }
    .calendar-time-log-btn.loading {
      opacity: 0.5;
      pointer-events: none;
      animation: pulse 1s infinite;
    }
    .calendar-time-log-btn.success {
      background: #059669;
    }
    .calendar-time-log-btn.error {
      background: #ef4444;
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 0.8; }
    }
  `;

  // Inject styles
  if (typeof GM_addStyle === "function") {
    GM_addStyle(css);
  } else {
    const style = document.createElement("style");
    style.textContent = css;
    document.documentElement.appendChild(style);
  }

  // Extract auth token from the page
  function getAuthToken() {
    // Try to get from localStorage first (Productive stores session data there)
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.includes("token") || key.includes("auth")) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data && data.token) return data.token;
        } catch (e) {
          const val = localStorage.getItem(key);
          if (val && val.length > 20) return val;
        }
      }
    }

    // Try to intercept from existing fetch requests by checking for Authorization header pattern
    // Productive.io typically uses Bearer tokens
    const cookies = document.cookie;
    const tokenMatch = cookies.match(/token=([^;]+)/);
    if (tokenMatch) return tokenMatch[1];

    return null;
  }

  // Get organization ID from URL or page
  function getOrganizationId() {
    // URL pattern: https://app.productive.io/ORG_ID/...
    const match = window.location.pathname.match(/^\/(\d+)/);
    if (match) return match[1];

    // Fallback: try to find in localStorage
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.includes("organization")) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data && data.id) return data.id;
        } catch (e) {}
      }
    }
    return null;
  }

  // API helper using fetch with credentials
  async function apiRequest(endpoint, options = {}) {
    const orgId = getOrganizationId();
    const baseUrl = `https://api.productive.io/api/v2`;

    const headers = {
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
      "X-Organization-Id": orgId,
      ...options.headers,
    };

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      log("API Error:", response.status, errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
  }

  // Find the first service with "Strategy" in its name for a given project
  async function findStrategyService(projectId) {
    log("Finding Strategy service for project:", projectId);

    try {
      // Get services for the project
      const response = await apiRequest(
        `/services?filter[project_id]=${projectId}&page[size]=100`
      );

      if (response.data && response.data.length > 0) {
        // Find first service with "Strategy" in the name (case-insensitive)
        const strategyService = response.data.find((service) =>
          service.attributes.name.toLowerCase().includes("strategy")
        );

        if (strategyService) {
          log("Found Strategy service:", strategyService.attributes.name);
          return strategyService;
        }
      }

      log("No Strategy service found");
      return null;
    } catch (error) {
      log("Error finding Strategy service:", error);
      throw error;
    }
  }

  // Get task details including remaining time and due date
  async function getTaskDetails(taskId) {
    log("Getting task details for:", taskId);

    try {
      const response = await apiRequest(
        `/tasks/${taskId}?include=project`
      );

      log("Task details:", response);
      return response;
    } catch (error) {
      log("Error getting task details:", error);
      throw error;
    }
  }

  // Create a time entry
  async function createTimeEntry(taskId, serviceId, date, minutes, note = "") {
    log("Creating time entry:", { taskId, serviceId, date, minutes });

    const payload = {
      data: {
        type: "time_entries",
        attributes: {
          date: date,
          time: minutes,
          note: note || "Logged via Calendar Time Logger",
        },
        relationships: {
          task: {
            data: {
              type: "tasks",
              id: taskId,
            },
          },
          service: {
            data: {
              type: "services",
              id: serviceId,
            },
          },
        },
      },
    };

    try {
      const response = await apiRequest("/time_entries", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      log("Time entry created:", response);
      return response;
    } catch (error) {
      log("Error creating time entry:", error);
      throw error;
    }
  }

  // Main function to log time for a task
  async function logTimeForTask(taskId, button) {
    button.classList.add("loading");
    button.textContent = "...";

    try {
      // Get task details
      const taskResponse = await getTaskDetails(taskId);
      const task = taskResponse.data;
      const taskAttributes = task.attributes;

      // Get remaining estimated time (in minutes)
      const remainingMinutes = taskAttributes.remaining_time || 0;

      if (remainingMinutes <= 0) {
        alert("This task has no remaining estimated time to log.");
        button.classList.remove("loading");
        button.textContent = "⏱";
        return;
      }

      // Get due date
      const dueDate = taskAttributes.due_date;

      if (!dueDate) {
        alert("This task has no due date set.");
        button.classList.remove("loading");
        button.textContent = "⏱";
        return;
      }

      // Get project ID from relationships
      const projectId = task.relationships?.project?.data?.id;

      if (!projectId) {
        alert("Could not determine the project for this task.");
        button.classList.remove("loading");
        button.textContent = "⏱";
        return;
      }

      // Find Strategy service
      const strategyService = await findStrategyService(projectId);

      if (!strategyService) {
        alert(
          'No service with "Strategy" in the name found for this project.'
        );
        button.classList.remove("loading");
        button.textContent = "⏱";
        return;
      }

      // Create time entry
      await createTimeEntry(
        taskId,
        strategyService.id,
        dueDate,
        remainingMinutes,
        `Remaining estimate logged for: ${taskAttributes.title || "Task"}`
      );

      // Success feedback
      button.classList.remove("loading");
      button.classList.add("success");
      button.textContent = "✓";

      // Show success message
      const formattedTime = formatMinutes(remainingMinutes);
      log(`Successfully logged ${formattedTime} on ${dueDate}`);

      // Reset button after delay
      setTimeout(() => {
        button.classList.remove("success");
        button.textContent = "⏱";
      }, 3000);
    } catch (error) {
      console.error("[Calendar Time Logger] Error:", error);
      button.classList.remove("loading");
      button.classList.add("error");
      button.textContent = "!";

      alert(`Failed to log time: ${error.message}`);

      // Reset button after delay
      setTimeout(() => {
        button.classList.remove("error");
        button.textContent = "⏱";
      }, 3000);
    }
  }

  // Format minutes to human readable
  function formatMinutes(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  }

  // Extract task ID from a calendar task element
  function getTaskIdFromElement(element) {
    // Try data attributes first
    if (element.dataset.taskId) return element.dataset.taskId;
    if (element.dataset.id) return element.dataset.id;

    // Try to find in parent elements
    const parent = element.closest("[data-task-id], [data-id]");
    if (parent) {
      return parent.dataset.taskId || parent.dataset.id;
    }

    // Try to extract from href if it's a link
    const link = element.querySelector("a[href*='/tasks/']") || element.closest("a[href*='/tasks/']");
    if (link) {
      const match = link.href.match(/\/tasks\/(\d+)/);
      if (match) return match[1];
    }

    // Try to find task ID in any nested element's attributes
    const allElements = element.querySelectorAll("*");
    for (const el of allElements) {
      for (const attr of el.attributes) {
        if (attr.value.match(/^\d+$/) && attr.name.includes("task")) {
          return attr.value;
        }
      }
    }

    return null;
  }

  // Add log button to a calendar task element
  function addLogButton(taskElement) {
    // Skip if already processed
    if (taskElement.dataset.timeLoggerProcessed) return;
    taskElement.dataset.timeLoggerProcessed = "true";

    const taskId = getTaskIdFromElement(taskElement);
    if (!taskId) {
      log("Could not find task ID for element:", taskElement);
      return;
    }

    log("Adding log button for task:", taskId);

    // Create the button
    const button = document.createElement("span");
    button.className = "calendar-time-log-btn";
    button.textContent = "⏱";
    button.title = "Log remaining estimated time on due date (Strategy service)";

    // Handle click
    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      logTimeForTask(taskId, button);
    });

    // Find the best place to insert the button
    // Look for the task title/content area
    const titleArea =
      taskElement.querySelector('[class*="title"]') ||
      taskElement.querySelector('[class*="name"]') ||
      taskElement.querySelector('[class*="content"]') ||
      taskElement.querySelector("span") ||
      taskElement;

    // Insert after the title text or at the end
    if (titleArea !== taskElement) {
      titleArea.appendChild(button);
    } else {
      taskElement.appendChild(button);
    }
  }

  // Check if we're in calendar view
  function isCalendarView() {
    const url = window.location.href;
    // Calendar view typically has /calendar or /schedule in the URL
    // Or check for calendar-specific DOM elements
    return (
      url.includes("/calendar") ||
      url.includes("/schedule") ||
      url.includes("/scheduling") ||
      document.querySelector('[class*="calendar"]') !== null ||
      document.querySelector('[data-view="calendar"]') !== null
    );
  }

  // Find and process calendar task elements
  function processCalendarTasks() {
    if (!isCalendarView()) return;

    log("Processing calendar tasks...");

    // Common selectors for calendar task items
    const selectors = [
      '[class*="calendar"] [class*="task"]',
      '[class*="calendar"] [class*="event"]',
      '[class*="calendar-item"]',
      '[class*="schedule"] [class*="task"]',
      '[class*="scheduling"] [class*="task"]',
      '[data-type="task"]',
      '[class*="CalendarTask"]',
      '[class*="calendar-task"]',
      '[class*="event-item"]',
      '.fc-event', // FullCalendar
      '[class*="task-card"]',
      '[class*="TaskCard"]',
    ];

    const allTasks = new Set();

    for (const selector of selectors) {
      try {
        const tasks = document.querySelectorAll(selector);
        tasks.forEach((task) => allTasks.add(task));
      } catch (e) {
        // Invalid selector, skip
      }
    }

    log(`Found ${allTasks.size} potential calendar tasks`);

    allTasks.forEach((task) => {
      addLogButton(task);
    });
  }

  // Initialize observer for dynamic content
  function initObserver() {
    log("Initializing MutationObserver...");

    const observer = new MutationObserver((mutations) => {
      // Debounce processing
      clearTimeout(observer.timeout);
      observer.timeout = setTimeout(() => {
        processCalendarTasks();
      }, 300);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Initial processing
    processCalendarTasks();

    // Also process on URL changes (SPA navigation)
    let lastUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        log("URL changed, reprocessing...");
        // Reset processed flags on URL change
        document.querySelectorAll("[data-time-logger-processed]").forEach((el) => {
          delete el.dataset.timeLoggerProcessed;
        });
        processCalendarTasks();
      }
    }, 1000);
  }

  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initObserver);
  } else {
    initObserver();
  }

  log("Calendar Task Time Logger initialized");
})();

/**
 * ChatGPT Research Report Exporter
 * A Chrome extension that adds a PDF export button to ChatGPT's research reports
 */
(function() {
  // ---------------------
  // Configuration and Helpers
  // ---------------------
  const config = {
    debug: false, // Set to false for production
    exportButtonId: 'research-pdf-export-button',
    researchMarkerText: 'Research completed in',
    loadingIndicatorId: 'pdf-export-loading'
  };

  /** Logs messages only if config.debug is true. */
  const log = (message) => {
    if (config.debug) {
      console.log(`[PDF Exporter] ${message}`);
    }
  };

  // ---------------------
  // Initialization
  // ---------------------
  function init() {
    log('Initializing Research Report Exporter');

    // Observe DOM changes for research reports
    setupObserver();

    // Check if a research report might already be present
    checkForResearchReport();
  }

  /**
   * Sets up a MutationObserver to detect when a research report is loaded.
   */
  function setupObserver() {
    log('Setting up observer');
    const observer = new MutationObserver((mutations) => {
      const shouldCheck = mutations.some((mutation) =>
        Array.from(mutation.addedNodes).some((node) =>
          node.nodeType === Node.TEXT_NODE ||
          (node.nodeType === Node.ELEMENT_NODE &&
            node.textContent.includes(config.researchMarkerText))
        )
      );

      if (shouldCheck) {
        checkForResearchReport();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  /**
   * Checks if a research report is present on the page and injects the export button if needed.
   */
  function checkForResearchReport() {
    log('Checking for research report');

    // Look for the research marker text
    const hasResearchReport = document.body.textContent.includes(config.researchMarkerText);
    if (!hasResearchReport) return;

    log('Research report detected');

    // Avoid creating multiple buttons
    const existingButton = document.getElementById(config.exportButtonId);
    if (existingButton) {
      log('Export button already exists');
      return;
    }

    // Insert the button in the most relevant container
    addExportButtonToRelevantContainer();
  }

  /**
   * Finds the most relevant container near the research marker and inserts the export button.
   */
  function addExportButtonToRelevantContainer() {
    // Gather all potential containers
    const containers = document.querySelectorAll('.flex.items-center');

    // Filter to containers that have buttons and are near the marker
    const filtered = Array.from(containers).filter((container) => {
      const hasButtons = container.querySelectorAll('button').length > 0;
      const article = container.closest('article');
      const nearResearchMarker =
        container.textContent.includes(config.researchMarkerText) ||
        (article && article.textContent.includes(config.researchMarkerText));
      return hasButtons && nearResearchMarker;
    });

    // Insert into the first valid container
    if (filtered.length > 0) {
      insertExportButton(filtered[0]);
    }
  }

  /**
   * Inserts the "Export to PDF" button into the specified container.
   * Removes any previous instance of the export button first.
   */
  function insertExportButton(container) {
    log('Inserting export button');

    // Remove any existing export buttons
    removeExistingExportButtons();

    // Create the button and tooltip
    const buttonSpan = document.createElement('span');
    buttonSpan.className = '';
    buttonSpan.dataset.state = 'closed';

    const tooltipContainer = document.createElement('div');
    tooltipContainer.style.position = 'relative';

    const tooltip = createTooltipElement('Export to PDF');
    tooltipContainer.appendChild(tooltip);

    const buttonElement = createButtonElement();
    tooltipContainer.appendChild(buttonElement);

    buttonSpan.appendChild(tooltipContainer);
    container.appendChild(buttonSpan);

    log('Export button inserted');
  }

  /**
   * Removes existing export buttons from the DOM.
   */
  function removeExistingExportButtons() {
    const existingButtons = document.querySelectorAll(`#${config.exportButtonId}`);
    existingButtons.forEach((button) => {
      const buttonContainer = button.closest('span[data-state]');
      if (buttonContainer) {
        buttonContainer.remove();
      } else {
        button.remove();
      }
    });
  }

  /**
   * Creates the tooltip element for the export button.
   * @param {string} text - Tooltip text
   * @returns {HTMLDivElement}
   */
  function createTooltipElement(text) {
    const tooltip = document.createElement('div');
    tooltip.textContent = text;
    tooltip.className = 'pdf-tooltip';
    
    // Tooltip arrow
    const tooltipArrow = document.createElement('div');
    tooltipArrow.className = 'pdf-tooltip-arrow';
    
    tooltip.appendChild(tooltipArrow);
    return tooltip;
  }

  /**
   * Creates the main export button with its icon and event handlers.
   * @returns {HTMLButtonElement}
   */
  function createButtonElement() {
    const buttonElement = document.createElement('button');
    buttonElement.id = config.exportButtonId;
    buttonElement.className = 'rounded-lg text-token-text-secondary hover:bg-token-main-surface-secondary';
    buttonElement.setAttribute('aria-label', 'Export to PDF');

    // Button icon
    const buttonContent = document.createElement('span');
    buttonContent.className = 'flex h-[30px] w-[30px] items-center justify-center';
    buttonContent.innerHTML = `
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="icon-md-heavy"
      >
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M7 2a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V7.414A2 2 0 0018.414 6L14 1.586A2 2 0 0012.586 1H7zm0 2v16h10V8h-4V4H7zm9.586 1L14 3.414V6h2.586zM12 11a1 1 0 10-2 0v3H9a1 1 0 100 2h5a1 1 0 100-2h-1v-3a1 1 0 00-1-1z"
          fill="currentColor"
        ></path>
      </svg>
    `;
    buttonElement.appendChild(buttonContent);

    // Tooltip interactions
    buttonElement.addEventListener('mouseenter', () => {
      buttonElement.previousSibling.style.opacity = '1'; // Show tooltip
    });
    buttonElement.addEventListener('mouseleave', () => {
      buttonElement.previousSibling.style.opacity = '0'; // Hide tooltip
    });

    // Click: Export to PDF
    buttonElement.addEventListener('click', handleExportButtonClick);

    return buttonElement;
  }

  // ---------------------
  // Export Flow
  // ---------------------

  /**
   * Handles the export button click: shows loading, extracts content, and generates PDF.
   */
  function handleExportButtonClick() {
    log('Export button clicked');
    showLoadingIndicator();

    const content = extractResearchContent();
    if (!content) {
      log('No content found to export');
      hideLoadingIndicator();
      alert('Could not find research content to export. Please make sure the research report is fully loaded.');
      return;
    }

    generatePDF(content);
  }

  /**
   * Extracts the research report content from the page using known markers/structures.
   * @returns {Node|null} Cloned DOM content for the research report
   */
  function extractResearchContent() {
    log('Extracting research content');

    // Find the button(s) that contain the marker text
    const researchMarkers = Array.from(document.querySelectorAll('button'))
      .filter((el) => el.textContent.includes(config.researchMarkerText));

    if (researchMarkers.length === 0) {
      log('Research marker not found');
      return null;
    }

    const articleElement = researchMarkers[0].closest('article');
    if (!articleElement) {
      log('Article element not found');
      return null;
    }

    // Primary selector
    let researchContent = articleElement.querySelector('.deep-research-result');

    // Fallback #1: Look near the "Research completed" text
    if (!researchContent) {
      const completedTextDiv = Array.from(articleElement.querySelectorAll('div'))
        .find((div) => div.textContent.includes(config.researchMarkerText));
      if (completedTextDiv) {
        const parentElement = completedTextDiv.closest('.border-token-border-primary');
        if (parentElement && parentElement.nextElementSibling) {
          researchContent = parentElement.nextElementSibling;
        }
      }
    }

    // Fallback #2: If still not found, look for the next assistant message
    if (!researchContent) {
      const allAssistantMessages = articleElement.querySelectorAll('[data-message-author-role="assistant"]');
      for (let i = 0; i < allAssistantMessages.length; i++) {
        if (
          allAssistantMessages[i].textContent.includes(config.researchMarkerText) &&
          i + 1 < allAssistantMessages.length
        ) {
          researchContent = allAssistantMessages[i + 1];
          break;
        }
      }
    }

    if (!researchContent) {
      log('Research content not found using any selector');
      return null;
    }

    // Return a clone so we don't modify the original
    return researchContent.cloneNode(true);
  }

  /**
   * Generates the PDF by opening the print dialog in a new window with custom styles.
   * @param {Node} content - The cloned research content
   */
  function generatePDF(content) {
    log('Generating PDF using browser print');

    const formattedContainer = createFormattedContainer(content);
    const documentTitle = getDocumentTitle(content);

    // Open a new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(getPrintWindowHtml(documentTitle));
    printWindow.document.close();

    // Inject the content once the new window has loaded
    printWindow.onload = () => {
      const contentDiv = printWindow.document.getElementById('research-content');
      if (!contentDiv) {
        printWindow.close();
        hideLoadingIndicator();
        alert('Error preparing content for printing.');
        return;
      }

      // Insert the cloned content and trigger print
      contentDiv.appendChild(formattedContainer.cloneNode(true));
      setTimeout(() => {
        printWindow.print();
        hideLoadingIndicator();
      }, 500);
    };
  }

  /**
   * Returns the appropriate title for the document (from the first H1 if present).
   * @param {Node} content
   * @returns {string}
   */
  function getDocumentTitle(content) {
    let title = 'ChatGPT Research Report';
    const firstH1 = content.querySelector('h1');
    if (firstH1 && firstH1.textContent.trim()) {
      title = firstH1.textContent.trim();
    }
    return title;
  }

  /**
   * Returns the full HTML structure (as a string) for the print window.
   * @param {string} documentTitle
   * @returns {string}
   */
  function getPrintWindowHtml(documentTitle) {
    return `
      <html>
        <head>
          <title>${documentTitle}</title>
          <link rel="stylesheet" href="${chrome.runtime.getURL('css/print-styles.css')}">
        </head>
        <body class="pdf-print">
          <div class="date-generated">Generated on ${new Date().toLocaleDateString()}</div>
          <div id="research-content"></div>
        </body>
      </html>
    `;
  }

  /**
   * Creates and returns a <div> containing the research content with extra formatting/styling.
   * @param {Node} content
   * @returns {HTMLDivElement}
   */
  function createFormattedContainer(content) {
    log('Creating formatted container');

    // Outer container
    const container = document.createElement('div');
    container.className = 'pdf-container';

    // Clone the content
    const clonedContent = content.cloneNode(true);

    // Fix citations
    fixCitationElements(clonedContent);

    // Remove elements we don't need in the final PDF
    const unnecessaryElements = clonedContent.querySelectorAll('.citation-actions, .cite-expanded');
    unnecessaryElements.forEach((el) => el.remove());

    container.appendChild(clonedContent);
    return container;
  }

  /**
   * Ensures citation elements display consistently and inline.
   * @param {Node} element
   */
  function fixCitationElements(element) {
    const citationSelector = `
      .relative.inline-flex.items-center,
      [data-citation-target],
      .citation-item,
      .citation-link,
      sup,
      [role="button"][data-testid*="citation"],
      .simplified-citation,
      .citation-badge,
      [data-testid*="citation-wrapper"]
    `;
    const citations = element.querySelectorAll(citationSelector);

    citations.forEach((citation) => {
      // Ensure spacing before the citation
      if (citation.previousSibling && citation.previousSibling.nodeType === Node.TEXT_NODE) {
        const txt = citation.previousSibling.textContent;
        if (txt && !txt.endsWith(' ')) {
          citation.previousSibling.textContent = `${txt} `;
        }
      }

      // Clean up the text
      let citationText = citation.textContent.replace(/[\[\](){}]/g, '').trim();

      // Create a uniform badge element
      const badgeSpan = createCitationBadgeElement(citationText);

      // If the citation is or contains a button, handle differently
      if (citation.querySelector('button, [role="button"]')) {
        const buttons = citation.querySelectorAll('button, [role="button"]');
        buttons.forEach((btn) => {
          btn.parentNode.replaceChild(badgeSpan.cloneNode(true), btn);
        });
      } else if (
        citation.tagName.toLowerCase() === 'sup' ||
        citation.classList.contains('citation-item') ||
        citation.classList.contains('simplified-citation')
      ) {
        // Replace the entire node
        if (citation.parentNode) {
          citation.parentNode.replaceChild(badgeSpan, citation);
        }
      } else {
        // Replace the contents - don't add the class since we're replacing the content
        citation.innerHTML = '';
        citation.appendChild(badgeSpan);
      }
    });

    // Also handle numeric citations in <sup>
    fixNumericSuperscripts(element);
  }

  /**
   * Creates a span element styled as a citation badge.
   * @param {string} text
   * @returns {HTMLSpanElement}
   */
  function createCitationBadgeElement(text) {
    const badgeSpan = document.createElement('span');
    badgeSpan.className = 'citation-badge';
    badgeSpan.textContent = text;
    return badgeSpan;
  }

  /**
   * Replaces numeric <sup> elements with styled badge elements if they look like citations.
   * @param {Node} element
   */
  function fixNumericSuperscripts(element) {
    const superscripts = element.querySelectorAll('sup');
    superscripts.forEach((sup) => {
      const text = sup.textContent.trim();
      if (/^\d+$/.test(text)) {
        const badgeSpan = createCitationBadgeElement(text);
        if (sup.parentNode) {
          sup.parentNode.replaceChild(badgeSpan, sup);
        }
      }
    });
  }

  // ---------------------
  // Loading Indicator
  // ---------------------
  /**
   * Shows a loading indicator at the top of the page while generating the PDF.
   */
  function showLoadingIndicator() {
    // Remove existing indicator if any
    const existing = document.getElementById(config.loadingIndicatorId);
    if (existing) existing.remove();

    // Create loading indicator
    const indicator = document.createElement('div');
    indicator.id = config.loadingIndicatorId;

    indicator.innerHTML = `
      <div class="loading-container">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          class="loading-spinner"
        >
          <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" stroke-dasharray="30 10" />
        </svg>
        <span>Generating PDF...</span>
      </div>
    `;

    document.body.appendChild(indicator);
  }

  /**
   * Hides the loading indicator.
   */
  function hideLoadingIndicator() {
    const indicator = document.getElementById(config.loadingIndicatorId);
    if (indicator) indicator.remove();
  }

  // ---------------------
  // DOM Ready
  // ---------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

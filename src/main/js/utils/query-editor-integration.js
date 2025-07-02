// Utility functions for integrating grid headers with query editor

/**
 * Inserts text at the current cursor position in a textarea or input element
 * @param {HTMLElement} element - The textarea or input element
 * @param {string} textToInsert - The text to insert
 * @returns {string} The updated text content
 */
export function insertTextAtCursor(element, textToInsert) {
    if (!element) return '';
    
    // Check if this is an Ace Editor textarea
    if (element.classList && element.classList.contains('ace_text-input')) {
        // For Ace Editor, we need to find the editor instance
        const aceEditorContainer = element.closest('.ace_editor');
        if (aceEditorContainer && window.ace) {
            const aceEditor = window.ace.edit(aceEditorContainer);
            if (aceEditor) {
                aceEditor.insert(textToInsert);
                aceEditor.focus();
                return aceEditor.getValue();
            }
        }
    }
    
    // Standard textarea handling
    const startPos = element.selectionStart;
    const endPos = element.selectionEnd;
    const currentText = element.value;
    
    const beforeCursor = currentText.substring(0, startPos);
    const afterCursor = currentText.substring(endPos);
    
    const newText = beforeCursor + textToInsert + afterCursor;
    
    // Update the element value
    element.value = newText;
    
    // Set cursor position after inserted text
    const newCursorPos = startPos + textToInsert.length;
    element.setSelectionRange(newCursorPos, newCursorPos);
    
    // Trigger input event to notify React of the change
    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);
    
    return newText;
}

/**
 * Finds the active query editor element on the page
 * @returns {HTMLElement|null} The query editor element or null if not found
 */
export function findQueryEditor() {
    // Look for Ace Editor textarea (most common in your app)
    const aceEditor = document.querySelector('.ace_text-input');
    if (aceEditor) {
        return aceEditor;
    }
    
    // Look for other common query editor selectors
    const selectors = [
        'textarea[data-query-editor]',
        'textarea[name="query"]',
        '.monaco-editor textarea', // Monaco editor
        '.cm-editor .cm-content', // CodeMirror
        'textarea.query-input',
        '#query-editor textarea'
    ];
    
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) return element;
    }
    
    // Fallback: find any focused textarea
    const focused = document.activeElement;
    if (focused && focused.tagName === 'TEXTAREA') {
        return focused;
    }
    
    return null;
}

/**
 * Converts header text to a query-friendly format
 * @param {string} headerText - The header text to convert
 * @returns {string} Query-friendly text
 */
export function formatHeaderForQuery(headerText) {
    return headerText
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
}

/**
 * Inserts header text into the active query editor
 * @param {string} headerText - The header text to insert
 * @param {Object} options - Options for insertion
 * @param {boolean} options.asField - Insert as field name
 * @param {boolean} options.asCondition - Insert as WHERE condition
 * @param {boolean} options.asSelectField - Insert in SELECT clause
 * @returns {boolean} True if insertion was successful
 */
export function insertHeaderIntoQuery(headerText, options = {}) {
    const editor = findQueryEditor();
    if (!editor) {
        console.warn('No query editor found for header insertion');
        return false;
    }
    
    let textToInsert = formatHeaderForQuery(headerText);
    
    if (options.asCondition) {
        textToInsert = `${textToInsert} = ""`;
    } else if (options.asSelectField) {
        textToInsert = `${textToInsert}, `;
    }
    
    insertTextAtCursor(editor, textToInsert);
    
    // Focus the editor after insertion
    editor.focus();
    
    return true;
}

/**
 * Hook for handling header clicks in grid components
 * @param {Object} options - Configuration options
 * @returns {Function} Header click handler function
 */
export function useHeaderClickHandler(options = {}) {
    const handleHeaderClick = (headerText) => {
        const success = insertHeaderIntoQuery(headerText, {
            asField: true,
            ...options
        });
        
        if (!success && options.fallbackNavigation) {
            // Fallback to navigation if direct insertion fails
            options.fallbackNavigation(headerText);
        }
        
        // Optional callback for additional handling
        if (options.onHeaderClick) {
            options.onHeaderClick(headerText, success);
        }
    };
    
    return handleHeaderClick;
}

/**
 * Enhanced header click handler that works with React state
 * @param {Function} setQuery - React state setter for query
 * @param {string} currentQuery - Current query value
 * @param {Object} options - Additional options
 * @returns {Function} Header click handler
 */
export function createReactHeaderClickHandler(setQuery, currentQuery, options = {}) {
    return (headerText) => {
        const editor = findQueryEditor();
        const formattedHeader = formatHeaderForQuery(headerText);
        let newQuery;
        
        // Check if this is an Ace Editor
        if (editor && editor.classList && editor.classList.contains('ace_text-input')) {
            const aceEditorContainer = editor.closest('.ace_editor');
            if (aceEditorContainer && window.ace) {
                const aceEditor = window.ace.edit(aceEditorContainer);
                if (aceEditor) {
                    // Insert at cursor position in Ace Editor
                    aceEditor.insert(formattedHeader);
                    newQuery = aceEditor.getValue();
                    setQuery(newQuery);
                    aceEditor.focus();
                    
                    if (options.onHeaderClick) {
                        options.onHeaderClick(headerText, newQuery);
                    }
                    return;
                }
            }
        }
        
        // Standard textarea handling
        if (editor && editor.selectionStart !== undefined) {
            // Use cursor position if available
            const startPos = editor.selectionStart;
            const endPos = editor.selectionEnd;
            const beforeCursor = currentQuery.substring(0, startPos);
            const afterCursor = currentQuery.substring(endPos);
            
            newQuery = beforeCursor + formattedHeader + afterCursor;
        } else {
            // Fallback: append to end of query
            newQuery = currentQuery + ' ' + formattedHeader;
        }
        
        setQuery(newQuery);
        
        // Focus editor after state update
        setTimeout(() => {
            if (editor) editor.focus();
        }, 0);
        
        if (options.onHeaderClick) {
            options.onHeaderClick(headerText, newQuery);
        }
    };
}

export default {
    insertTextAtCursor,
    findQueryEditor,
    formatHeaderForQuery,
    insertHeaderIntoQuery,
    useHeaderClickHandler,
    createReactHeaderClickHandler
}; 
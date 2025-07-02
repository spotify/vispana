import React, {useEffect, useState, useMemo} from "react";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/snippets/json";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-tomorrow_night";
import "ace-builds/src-noconflict/ext-language_tools";
import {LanguageProvider} from "ace-linters/build/ace-linters";
import schema from "./query-schema"

function EditorHybrid({query, setQuery, handleRunQuery, handleFormatQuery, vespaState}) {
    const [aceLinterActive, setAceLinterActive] = useState(false);
    const [editorInstance, setEditorInstance] = useState(null);
    const [schemaFields, setSchemaFields] = useState([]);
    const schemaObj = useMemo(() => schema(), []);

    // Extract field names from vespaState schema content
    useEffect(() => {
        if (vespaState && vespaState.content && vespaState.content.clusters) {
            const allFields = [];
            vespaState.content.clusters.forEach((cluster, clusterIndex) => {
                cluster.contentData.forEach((contentData, dataIndex) => {
                    const schemaContent = contentData.schema.schemaContent;
                    // Extract field names from schema content (.sd file)
                    const fieldMatches = schemaContent.match(/field\s+(\w+)\s+type/g);
                    if (fieldMatches) {
                        fieldMatches.forEach(match => {
                            const fieldName = match.match(/field\s+(\w+)\s+type/)[1];
                            if (!allFields.includes(fieldName)) {
                                allFields.push(fieldName);
                            }
                        });
                    } else {
                        // Try alternative patterns
                        const altMatches = schemaContent.match(/field\s+(\w+)\s*{/g);

                        if (altMatches) {
                            altMatches.forEach(match => {
                                const fieldName = match.match(/field\s+(\w+)\s*{/)[1];
                                if (!allFields.includes(fieldName)) {
                                    allFields.push(fieldName);
                                }
                            });
                        }
                    }
                });
            });
            
            setSchemaFields(allFields.sort());
        } else {
            console.log("EditorHybrid: vespaState not available or incomplete");
        }
    }, [vespaState]);

    // Configure ace worker path properly
    useEffect(() => {
        // Set the correct worker path for ace
        const ace = window.ace;
        if (ace && ace.config) {
            ace.config.set('workerPath', '/built/');
            // Alternatively, just disable workers since we have custom validation
            ace.config.set('useWorker', false);
        }
    }, []);

    // Try to initialize ace-linters
    useEffect(() => {
        const initAceLinters = async () => {
            try {
                // Use static import instead of dynamic import
                const provider = LanguageProvider.fromCdn("https://cdn.jsdelivr.net/npm/ace-linters@0.13.3/build/");
                
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                provider.setGlobalOptions("json", {
                    schemas: [{
                        uri: "query-schema.json",
                        fileMatch: ["*"],
                        schema: schemaObj
                    }]
                });
                
                window.vispanaLintProvider = provider;
                setAceLinterActive(true);
                console.log("Ace-linters activated");
                
            } catch (error) {
                console.log("Ace-linters failed, using enhanced basic mode:", error);
                // Don't call initCustomValidation here, it will be called by useEffect
            }
        };

        initAceLinters();
    }, [schemaObj]);

    // Enhanced JSON validator with YQL support
    const validateJSON = (value) => {
        const annotations = [];
        
        try {
            const parsedJSON = JSON.parse(value);
            
            // Check required fields
            if (schemaObj.required) {
                schemaObj.required.forEach(requiredField => {
                    if (!(requiredField in parsedJSON)) {
                        annotations.push({
                            row: 0,
                            column: 0,
                            text: `Missing required property: ${requiredField}`,
                            type: "error"
                        });
                    }
                });
            }
            
            // Validate each property
            Object.keys(parsedJSON).forEach(key => {
                let isValidProperty = false;
                
                // Explicitly allow any rankfeature pattern - no warnings for rankfeature
                if (key.startsWith('rankfeature.')) {
                    isValidProperty = true;
                }
                
                // Check if it's a defined property
                if (!isValidProperty && schemaObj.properties && schemaObj.properties[key]) {
                    isValidProperty = true;
                }
                
                // Check if it matches any pattern properties
                if (!isValidProperty && schemaObj.patternProperties) {
                    Object.keys(schemaObj.patternProperties).forEach(pattern => {
                        const regex = new RegExp(pattern);
                        if (regex.test(key)) {
                            isValidProperty = true;
                        }
                    });
                }
                
                if (!isValidProperty) {
                    annotations.push({
                        row: 0,
                        column: 0,
                        text: `Unknown property: ${key}`,
                        type: "warning"
                    });
                }
            });
            
        } catch (e) {
            annotations.push({
                row: 0,
                column: 0,
                text: `Invalid JSON: ${e.message}`,
                type: "error"
            });
        }
        
        return annotations;
    };

    // Create schema completer that updates when schemaFields change
    const [schemaCompleter, setSchemaCompleter] = useState(null);
    
    useEffect(() => {
        const newCompleter = {
            getCompletions: function(editor, session, pos, prefix, callback) {
                const completions = [];
                
                // Get current cursor context
                const lineText = session.getLine(pos.row);
                const beforeCursor = lineText.substring(0, pos.column);
                
                // Check if we're inside any string value
                const stringContext = this.getStringContext(beforeCursor);
                if (stringContext.inString) {
                    if (stringContext.isYQLString && !stringContext.insideSingleQuotes && !stringContext.insideEscapedQuotes) {
                        // Inside YQL string but not inside quotes - provide field completions
                        this.getFieldCompletions(completions, prefix);
                    } else {
                        // Inside any other string value OR inside quotes in YQL - disable completions
                        callback(null, []);
                        return;
                    }
                } else {
                    // We're editing JSON structure, not string content
                    // Analyze JSON context for nested properties
                    const jsonContext = this.analyzeJSONContext(session, pos);
                    
                    if (jsonContext.isInNestedObject && jsonContext.parentProperty) {
                        // We're inside a nested object, provide nested property completions
                        this.addNestedPropertyCompletions(jsonContext.parentProperty, jsonContext.currentPath, completions, prefix);
                    } else {
                        // We're at root level, provide top-level completions including rankfeatures
                        this.addTopLevelCompletions(completions, prefix);
                        this.addRankfeatureCompletions(completions, prefix);
                    }
                }

                callback(null, completions);
            },

            getStringContext: function(beforeCursor) {
                // Parse the text character by character to properly handle escaped quotes
                let inString = false;
                let escaped = false;
                let lastPropertyName = null;
                let currentPropertyName = null;
                let collectingPropertyName = false;
                let propertyNameBuffer = '';
                let afterColon = false;
                
                for (let i = 0; i < beforeCursor.length; i++) {
                    const char = beforeCursor[i];
                    
                    if (escaped) {
                        escaped = false;
                        if (collectingPropertyName) {
                            propertyNameBuffer += char;
                        }
                        continue;
                    }
                    
                    if (char === '\\') {
                        escaped = true;
                        continue;
                    }
                    
                    if (char === '"') {
                        if (inString) {
                            // Ending a string
                            inString = false;
                            if (collectingPropertyName) {
                                currentPropertyName = propertyNameBuffer;
                                collectingPropertyName = false;
                                propertyNameBuffer = '';
                            }
                        } else {
                            // Starting a string
                            inString = true;
                            if (afterColon) {
                                // This is a property value, not a property name
                                lastPropertyName = currentPropertyName;
                                afterColon = false;
                            } else {
                                // This might be a property name
                                collectingPropertyName = true;
                                propertyNameBuffer = '';
                            }
                        }
                    } else if (!inString) {
                        if (char === ':') {
                            afterColon = true;
                        } else if (char !== ' ' && char !== '\t' && char !== '\n') {
                            afterColon = false;
                        }
                    } else if (collectingPropertyName) {
                        propertyNameBuffer += char;
                    }
                }
                
                const isYQLString = inString && lastPropertyName === 'yql';
                
                // If we're in a YQL string, check if we're inside quotes
                let insideSingleQuotes = false;
                let insideEscapedQuotes = false;
                if (isYQLString) {
                    const quoteContext = this.getYQLQuoteContext(beforeCursor);
                    insideSingleQuotes = quoteContext.insideSingleQuotes;
                    insideEscapedQuotes = quoteContext.insideEscapedQuotes;
                }
                
                return {
                    inString: inString,
                    isYQLString: isYQLString,
                    insideSingleQuotes: insideSingleQuotes,
                    insideEscapedQuotes: insideEscapedQuotes,
                    lastPropertyName: lastPropertyName
                };
            },

            getYQLQuoteContext: function(beforeCursor) {
                // Use a simpler approach: find the last "yql": " and extract everything after it
                const yqlPattern = /"yql"\s*:\s*"/;
                const yqlMatch = beforeCursor.match(yqlPattern);
                
                if (!yqlMatch) {
                    console.log("EditorHybrid: No YQL property found");
                    return { insideSingleQuotes: false, insideEscapedQuotes: false };
                }
                
                // Find the start of the YQL value (after "yql": ")
                const yqlStartIndex = yqlMatch.index + yqlMatch[0].length;
                
                // Extract everything from the YQL value start to the cursor
                let yqlContent = '';
                let escaped = false;
                
                for (let i = yqlStartIndex; i < beforeCursor.length; i++) {
                    const char = beforeCursor[i];
                    
                    if (escaped) {
                        escaped = false;
                        yqlContent += char;
                        continue;
                    }
                    
                    if (char === '\\') {
                        escaped = true;
                        yqlContent += char;
                        continue;
                    }
                    
                    if (char === '"' && !escaped) {
                        // Found unescaped quote - end of YQL string
                        break;
                    }
                    
                    yqlContent += char;
                }

                // Count unescaped single quotes and escaped double quotes
                let singleQuoteCount = 0;
                let escapedQuoteCount = 0;
                escaped = false;
                
                for (let i = 0; i < yqlContent.length; i++) {
                    const char = yqlContent[i];
                    if (escaped) {
                        if (char === '"') {
                            escapedQuoteCount++;
                        }
                        escaped = false;
                        continue;
                    }
                    if (char === '\\') {
                        escaped = true;
                        continue;
                    }
                    if (char === "'") {
                        singleQuoteCount++;
                    }
                }

                // If odd number of quotes, we're inside quotes
                const insideSingleQuotes = singleQuoteCount % 2 === 1;
                const insideEscapedQuotes = escapedQuoteCount % 2 === 1;

                return {
                    insideSingleQuotes: insideSingleQuotes,
                    insideEscapedQuotes: insideEscapedQuotes
                };
            },

            analyzeJSONContext: function(session, pos) {
                const result = {
                    isInNestedObject: false,
                    parentProperty: null,
                    currentPath: [],
                    nestingLevel: 0
                };

                try {
                    // Get all text up to cursor position
                    const textBeforeCursor = this.getTextBeforeCursor(session, pos);
                    
                    // Parse the JSON structure to understand nesting
                    const jsonStructure = this.parseJSONStructure(textBeforeCursor);
                    
                    result.isInNestedObject = jsonStructure.nestingLevel > 0;
                    result.parentProperty = jsonStructure.currentParent;
                    result.currentPath = jsonStructure.path;
                    result.nestingLevel = jsonStructure.nestingLevel;
                    
                } catch (error) {
                    // If parsing fails, assume root level
                    console.log("JSON context analysis failed:", error);
                }

                return result;
            },

            getTextBeforeCursor: function(session, pos) {
                let text = '';
                for (let row = 0; row <= pos.row; row++) {
                    const lineText = session.getLine(row);
                    if (row === pos.row) {
                        text += lineText.substring(0, pos.column);
                    } else {
                        text += lineText + '\n';
                    }
                }
                return text;
            },

            parseJSONStructure: function(text) {
                const result = {
                    nestingLevel: 0,
                    currentParent: null,
                    path: []
                };

                let braceDepth = 0;
                let inString = false;
                let escaped = false;
                let currentProperty = null;
                const propertyStack = [];

                for (let i = 0; i < text.length; i++) {
                    const char = text[i];
                    
                    if (escaped) {
                        escaped = false;
                        continue;
                    }

                    if (char === '\\') {
                        escaped = true;
                        continue;
                    }

                    if (char === '"') {
                        if (inString) {
                            inString = false;
                            // Check if this was a property name (followed by :)
                            let j = i + 1;
                            while (j < text.length && /\s/.test(text[j])) j++;
                            if (j < text.length && text[j] === ':') {
                                // This was a property name
                                const propStart = text.lastIndexOf('"', i - 1) + 1;
                                currentProperty = text.substring(propStart, i);
                            }
                        } else {
                            inString = true;
                        }
                        continue;
                    }

                    if (!inString) {
                        if (char === '{') {
                            braceDepth++;
                            if (currentProperty) {
                                propertyStack.push(currentProperty);
                                currentProperty = null;
                            }
                        } else if (char === '}') {
                            braceDepth--;
                            if (propertyStack.length > 0) {
                                propertyStack.pop();
                            }
                        }
                    }
                }

                result.nestingLevel = braceDepth;
                result.currentParent = propertyStack.length > 0 ? propertyStack[propertyStack.length - 1] : null;
                result.path = [...propertyStack];

                return result;
            },

            addTopLevelCompletions: function(completions, prefix) {
                // Add regular schema properties
                if (schemaObj.properties) {
                    Object.keys(schemaObj.properties).forEach(prop => {
                        if (!prefix || prop.toLowerCase().includes(prefix.toLowerCase())) {
                            const propSchema = schemaObj.properties[prop];
                            let snippet = `"${prop}": `;
                            let meta = propSchema.type || 'property';
                            
                            // Generate value based on type
                            switch (propSchema.type) {
                                case 'string':
                                    if (prop === 'yql') {
                                        snippet += '"select * from sources * where ${1:field} contains \'${2:value}\'"';
                                    } else {
                                        snippet += '""';
                                    }
                                    break;
                                case 'integer':
                                case 'number':
                                    snippet += '0';
                                    break;
                                case 'boolean':
                                    snippet += 'false';
                                    break;
                                case 'object':
                                    snippet += '{}';
                                    break;
                                case 'array':
                                    snippet += '[]';
                                    break;
                                default:
                                    snippet += '""';
                            }
                            
                            completions.push({
                                caption: prop,
                                snippet: snippet,
                                meta: meta,
                                score: schemaObj.required && schemaObj.required.includes(prop) ? 1000 : 500
                            });
                        }
                    });
                }
            },

            addNestedPropertyCompletions: function(parentProperty, currentPath, completions, prefix) {
                // Navigate to the correct nested schema
                let currentSchema = schemaObj;
                
                // Follow the path to get to the right nested schema
                for (const pathElement of currentPath) {
                    if (currentSchema.properties && currentSchema.properties[pathElement]) {
                        currentSchema = currentSchema.properties[pathElement];
                    } else {
                        // Path not found in schema
                        return;
                    }
                }

                // Add completions for properties at this level
                if (currentSchema.properties) {
                    Object.keys(currentSchema.properties).forEach(prop => {
                        if (!prefix || prop.toLowerCase().includes(prefix.toLowerCase())) {
                            const propSchema = currentSchema.properties[prop];
                            let snippet = `"${prop}": `;
                            let meta = propSchema.type || 'property';
                            
                            // Generate value based on type
                            switch (propSchema.type) {
                                case 'string':
                                    snippet += '""';
                                    break;
                                case 'integer':
                                case 'number':
                                    snippet += '0';
                                    break;
                                case 'boolean':
                                    snippet += 'false';
                                    break;
                                case 'object':
                                    snippet += '{}';
                                    break;
                                case 'array':
                                    snippet += '[]';
                                    break;
                                default:
                                    snippet += '""';
                            }
                            
                            completions.push({
                                caption: prop,
                                snippet: snippet,
                                meta: meta,
                                score: 600
                            });
                        }
                    });
                }
            },

            addRankfeatureCompletions: function(completions, prefix) {
                const rankfeatureExamples = [
                    {
                        caption: 'rankfeature.query(field)',
                        snippet: '"rankfeature.query(${1:field})": "${2:value}"',
                        meta: 'string',
                        score: 400
                    },
                    {
                        caption: 'rankfeature.fieldMatch(field)',
                        snippet: '"rankfeature.fieldMatch(${1:field})": "${2:value}"',
                        meta: 'string',
                        score: 400
                    }
                ];
                
                // Filter rankfeature suggestions based on prefix
                rankfeatureExamples.forEach(example => {
                    if (prefix.length === 0 || example.caption.toLowerCase().includes(prefix.toLowerCase())) {
                        completions.push(example);
                    }
                });
            },

            getFieldCompletions: function(completions, prefix) {
                // Use schema fields extracted from vespaState
                if (schemaFields.length > 0) {
                    schemaFields.forEach(field => {
                        if (!prefix || field.toLowerCase().includes(prefix.toLowerCase())) {
                            completions.push({
                                caption: field,
                                snippet: field,
                                meta: 'field',
                                score: 900
                            });
                        }
                    });
                } else {
                    // Add some fallback fields for testing
                    const fallbackFields = ['title', 'content', 'id', 'url'];
                    fallbackFields.forEach(field => {
                        if (!prefix || field.toLowerCase().includes(prefix.toLowerCase())) {
                            completions.push({
                                caption: field,
                                snippet: field,
                                meta: 'fallback field',
                                score: 800
                            });
                        }
                    });
                }
                
                // Add YQL keywords
                this.addYQLKeywords(completions, prefix);
            },

            addYQLKeywords: function(completions, prefix) {
                const yqlKeywords = [
                    'contains', 'matches', 'and', 'or', 'not', 'true', 'false',
                    'range', 'phrase', 'near', 'onear', 'equiv', 'fuzzy'
                ];
                
                yqlKeywords.forEach(keyword => {
                    if (!prefix || keyword.toLowerCase().includes(prefix.toLowerCase())) {
                        completions.push({
                            caption: keyword,
                            snippet: keyword,
                            meta: 'keyword',
                            score: 600
                        });
                    }
                });
            }
        };
        
        setSchemaCompleter(newCompleter);
    }, [schemaFields, schemaObj]); // Recreate completer when schemaFields or schemaObj change

    // Custom validation and autocomplete as fallback
    const initCustomValidation = () => {
        if (!editorInstance || !schemaCompleter) return;

        // Add custom completer (after clearing default ones)
        const langTools = window.ace.require("ace/ext/language_tools");
        if (langTools) {
            // Clear any existing completers first (disable local completions)
            langTools.setCompleters([]);
            // Add only our custom schema completer
            langTools.addCompleter(schemaCompleter);
        }
        
        // Add validation listener
        editorInstance.session.on('change', function() {
            const value = editorInstance.session.getValue();
            if (value.trim()) {
                const annotations = validateJSON(value);
                editorInstance.session.setAnnotations(annotations);
            }
        });

        console.log("Custom validation and autocomplete active (with YQL support, local completions disabled)");
    };

    // Set up commands
    const editorRef = React.useRef(null);
    useEffect(() => {
        if (editorRef?.current?.editor) {
            const editor = editorRef.current.editor
            const commands = []
            if (handleRunQuery) {
                commands.push({
                    name: 'run query',
                    exec: handleRunQuery,
                    bindKey: {mac: "Command-Enter", win: "Ctrl-Enter"}
                })
            }
            if (handleFormatQuery) {
                commands.push({
                    name: 'format query',
                    exec: () => handleFormatQuery(query),
                    bindKey: {mac: "Command-Option-L", win: "Ctrl-Alt-L"}
                })
            }
            editor.commands.addCommands(commands)
        }
    }, [editorRef?.current?.editor, query])

    // Initialize custom validation when editor changes and ace-linters is not active
    useEffect(() => {
        if (editorInstance && !aceLinterActive && schemaCompleter) {
            initCustomValidation();
        }
    }, [editorInstance, aceLinterActive, schemaCompleter]);

    const handleEditorLoad = (editor) => {
        console.log("Editor loaded");
        setEditorInstance(editor);
        
        // Configure autocomplete popup and disable local completions
        const langTools = window.ace.require("ace/ext/language_tools");
        if (langTools) {
            // Remove default completers (this disables "local" word-based completions)
            langTools.setCompleters([]);
            
            // Set up autocomplete with better configuration
            editor.setOptions({
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true,
                enableSnippets: true,
                completionDelay: 200,
                liveAutocompletionDelay: 300,
                liveAutocompletionThreshold: 1
            });
        }
        
        // Configure the autocomplete popup size
        editor.on('changeSelection', function() {
            const popup = editor.completer && editor.completer.popup;
            if (popup) {
                popup.container.style.width = '400px';
                popup.container.style.maxHeight = '300px';
                popup.container.style.fontSize = '13px';
            }
        });
        
        // Try ace-linters registration
        if (aceLinterActive && window.vispanaLintProvider) {
            setTimeout(() => {
                try {
                    window.vispanaLintProvider.registerEditor(editor);
                    window.vispanaLintProvider.setSessionOptions(editor.session, {
                        schemaUri: "query-schema.json"
                    });
                    console.log("Ace-linters registration successful");
                } catch (error) {
                    console.log("Ace-linters registration failed:", error);
                    setAceLinterActive(false);
                }
            }, 500);
        }
    };

    // Add custom CSS for larger autocomplete dropdown
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .ace_autocomplete {
                width: 400px !important;
                max-height: 300px !important;
                font-size: 13px !important;
            }
            
            .ace_autocomplete .ace_completion-meta {
                margin-left: 10px !important;
                font-style: normal !important;
            }
            
            .ace_autocomplete .ace_line {
                padding: 4px 8px !important;
                line-height: 1.4 !important;
            }
        `;
        document.head.appendChild(style);
        
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    return (<AceEditor
        ref={editorRef}
        height={"210px"}
        placeholder="Placeholder Text"
        mode="json"
        theme="tomorrow_night"
        name="query"
        onLoad={handleEditorLoad}
        className="min-w-full bg-standout-blue"
        onChange={(value, event) => {
            setQuery(value);
        }}
        fontSize={14}
        showPrintMargin={true}
        showGutter={true}
        highlightActiveLine={true}
        value={query || ''}
        setOptions={{
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: true,
            showLineNumbers: true,
            tabSize: 2,
            useWorker: false, // Disable worker since we have custom validation and ace-linters
            // Autocomplete configuration
            completionDelay: 200, // Slight delay for better performance
            liveAutocompletionDelay: 300, // Delay for live autocomplete
            liveAutocompletionThreshold: 1 // Start autocomplete after 1 character
        }}/>)
}

export default EditorHybrid; 
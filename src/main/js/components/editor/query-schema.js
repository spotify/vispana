export default function schema() {
    return {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
            // Query
            "yql": {type: "string", "minLength": 1},
            
            // Native Execution Parameters
            "hits": {type: "integer", minimum: 0, maximum: 400, description: "Maximum number of hits to return"},
            "offset": {type: "integer", minimum: 0, maximum: 1000, description: "Number of hits to skip"},
            "queryProfile": {type: "string", minLength: 1, description: "Query profile id with format name:version"},
            "groupingSessionCache": {type: "boolean", description: "Enable grouping session cache"},
            "searchChain": {type: "string", minLength: 1, description: "Search chain to use"},
            "timeout": {type: "string", minLength: 1, description: "Query timeout"},
            "recall": {type: "string", description: "Recall parameter to be combined with the query"},
            "user": {type: "string", description: "User id making the query"},
            "hitcountestimate": {type: "boolean", description: "Make this an estimation query"},
            "noCache": {type: "boolean", description: "Never serve this query from cache"},
            
            // Query Model Parameters  
            "model": {
                type: 'object',
                properties: {
                    "defaultIndex": {type: 'string', description: "Default index for query terms"},
                    "encoding": {type: 'string', description: "Character encoding"},
                    "filter": {type: 'string', description: "Filter to apply to query"},
                    "locale": {type: 'string', description: "Locale for linguistic processing"},
                    "language": {type: 'string', description: "Language for linguistic processing"},
                    "queryString": {type: 'string', description: "Query string"},
                    "restrict": {type: 'string', description: "Restrict to specific document types"},
                    "searchPath": {type: 'string', description: "Search path"},
                    "sources": {type: 'string', description: "Sources to search"},
                    "type": {type: 'string', description: "Query type"}
                },
                additionalProperties: false
            },
            
            // Ranking Parameters
            "ranking": {
                type: ['object', 'string'],
                properties: {
                    "location": {type: 'string', description: "Location for distance ranking"},
                    "features": {
                        type: 'object',
                        description: "Ranking features (input parameters)",
                        additionalProperties: true
                    },
                    "listFeatures": {type: 'boolean', description: "Include feature values in result"},
                    "profile": {type: 'string', description: "Ranking profile to use"},
                    "properties": {
                        type: 'object',
                        description: "Ranking properties",
                        additionalProperties: true
                    },
                    "softtimeout": {
                        type: 'object',
                        properties: {
                            "enable": {type: 'boolean', description: "Enable soft timeout"},
                            "factor": {type: 'number', minimum: 0, maximum: 1, description: "Timeout factor"}
                        },
                        additionalProperties: false
                    },
                    "sorting": {type: 'string', description: "Sorting specification"},
                    "freshness": {type: 'string', description: "Freshness boost"},
                    "queryCache": {type: 'boolean', description: "Enable query cache"},
                    "rerankCount": {type: 'integer', minimum: 0, description: "Number of hits to rerank"},
                    "keepRankCount": {type: 'integer', minimum: 0, description: "Keep rank count"},
                    "rankScoreDropLimit": {type: 'number', description: "Rank score drop limit"},
                    "matching": {
                        type: 'object',
                        properties: {
                            "numThreadsPerSearch": {type: 'integer', minimum: 0},
                            "minHitsPerThread": {type: 'integer', minimum: 0},
                            "numSearchPartitions": {type: 'integer', minimum: 0},
                            "termwiseLimit": {type: 'number', minimum: 0, maximum: 1},
                            "postFilterThreshold": {type: 'number', minimum: 0, maximum: 1},
                            "approximateThreshold": {type: 'number', minimum: 0, maximum: 1}
                        },
                        additionalProperties: false
                    },
                    "matchPhase": {
                        type: 'object',
                        properties: {
                            "attribute": {type: 'string', description: "Match phase attribute"},
                            "maxHits": {type: 'integer', description: "Maximum hits in match phase"},
                            "ascending": {type: 'boolean', description: "Ascending sort order"},
                            "diversity": {
                                type: 'object',
                                properties: {
                                    "attribute": {type: 'string'},
                                    "minGroups": {type: 'integer'}
                                },
                                additionalProperties: false
                            }
                        },
                        additionalProperties: false
                    },
                    "secondPhase": {
                        type: 'object',
                        properties: {
                            "rankScoreDropLimit": {type: 'number', description: "Second phase rank score drop limit"}
                        },
                        additionalProperties: false
                    },
                    "globalPhase": {
                        type: 'object', 
                        properties: {
                            "rerankCount": {type: 'integer', minimum: 0, description: "Global phase rerank count"},
                            "rankScoreDropLimit": {type: 'number', description: "Global phase rank score drop limit"}
                        },
                        additionalProperties: false
                    }
                },
                additionalProperties: false
            },
            
            // Presentation Parameters
            "presentation": {
                type: 'object',
                properties: {
                    "bolding": {type: 'boolean', description: "Enable term bolding in summaries"},
                    "format": {type: 'string', description: "Result format"},
                    "template": {type: 'string', description: "Result template"},
                    "summary": {type: 'string', description: "Summary class to use"},
                    "timing": {type: 'boolean', description: "Include timing information"}
                },
                additionalProperties: false
            },
            
            // Grouping and Aggregation
            "select": {type: 'string', description: "Grouping select expression"},
            "collapsesize": {type: 'integer', minimum: 1, description: "Number of hits per collapsed group"},
            "collapsefield": {type: 'string', description: "Field to collapse on"},
            "collapse": {
                type: 'object',
                properties: {
                    "summary": {type: 'string', description: "Summary for collapsed hits"}
                },
                additionalProperties: false
            },
            "grouping": {
                type: 'object',
                properties: {
                    "defaultMaxGroups": {type: 'integer', minimum: -1},
                    "defaultMaxHits": {type: 'integer', minimum: -1},
                    "globalMaxGroups": {type: 'integer', minimum: -1},
                    "defaultPrecisionFactor": {type: 'number', minimum: 0}
                },
                additionalProperties: false
            },
            
            // Streaming Parameters
            "streaming": {
                type: 'object',
                properties: {
                    "userid": {type: 'integer', description: "User ID for streaming search"},
                    "groupname": {type: 'string', description: "Group name for streaming search"},
                    "selection": {type: 'string', description: "Document selection for streaming"},
                    "priority": {type: 'string', description: "Priority for streaming"},
                    "maxbucketspervisitor": {type: 'integer', description: "Maximum buckets per visitor"}
                },
                additionalProperties: false
            },
            
            // Tracing Parameters
            "trace": {
                type: 'object',
                properties: {
                    "level": {type: 'integer', minimum: 1, description: "Trace level"},
                    "explainLevel": {type: 'integer', minimum: 1, description: "Explain level"},
                    "profileDepth": {type: 'integer', minimum: 1, description: "Profile depth"},
                    "timestamps": {type: 'boolean', description: "Include timestamps in trace"},
                    "query": {type: 'boolean', description: "Trace query processing"}
                },
                additionalProperties: false
            },
            "tracelevel": {type: 'integer', minimum: 0, description: "Legacy trace level parameter"},
            
            // Semantic Rules
            "rules": {
                type: 'object',
                properties: {
                    "off": {type: 'boolean', description: "Disable semantic rules"},
                    "rulebase": {type: 'string', description: "Rule base to use"}
                },
                additionalProperties: false
            },
            
            // Dispatch Parameters
            "dispatch": {
                type: 'object',
                properties: {
                    "topKProbability": {type: 'number', minimum: 0, maximum: 1, description: "Top-K probability for dispatch"}
                },
                additionalProperties: false
            },
            
            // Other Parameters
            "metrics": {
                type: 'object',
                properties: {
                    "ignore": {type: 'boolean', description: "Ignore metric collection"}
                },
                additionalProperties: false
            },
            "weakAnd": {
                type: 'object',
                properties: {
                    "replace": {type: 'boolean', description: "Replace OR with weakAnd"}
                },
                additionalProperties: false
            },
            "wand": {
                type: 'object',
                properties: {
                    "hits": {type: 'integer', description: "Target hits for WAND"}
                },
                additionalProperties: false
            },
            "sorting": {
                type: 'object',
                properties: {
                    "degrading": {type: 'boolean', description: "Enable degrading for sorting optimization"}
                },
                additionalProperties: false
            },

            // Additional commonly used parameters
            "summary": {type: 'string', description: "Summary class to use"}
        },
        "patternProperties": {
            "^rankfeature\\..*": {
                "type": ["string", "number"],
                "description": "Rank feature parameter - can be a string (e.g., tensor expressions) or number (e.g., weights)"
            }
        },
        "required": [
            "yql"
        ],
        "additionalProperties": true
    }
}

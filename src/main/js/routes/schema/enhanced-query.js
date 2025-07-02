import React, {useEffect, useState} from "react";
import {Tooltip} from "react-tooltip";
import {v4 as uuidv4} from 'uuid';
import EnhancedQueryResult from "../../components/query-result/enhanced-query-result";
import Editor from "../../components/editor/editor-hybrid";
import VispanaApiClient from "../../client/vispana-api-client";
import { createReactHeaderClickHandler } from "../../utils/query-editor-integration";

function EnhancedQuery({containerUrl, schema, searchParams, setSearchParams, vespaState}) {
    const vispanaClient = new VispanaApiClient()
    const [query, setQuery] = useState(defaultQuery)
    const [showResults, setShowResults] = useState(false)
    const [refreshQuery, setRefreshQuery] = useState(uuidv4())

    // Create header click handler that inserts field names into the query
    const handleHeaderClick = createReactHeaderClickHandler(
        setQuery, 
        query, 
        {
            onHeaderClick: (headerText, newQuery) => {
                console.log(`Inserted "${headerText}" into query`);
                // Update the search params with the new query
                searchParams.set(queryFieldFromSearchParam(schema), newQuery);
                setSearchParams(searchParams);
            }
        }
    );

    function runQuery() {
        searchParams.set(queryFieldFromSearchParam(schema), query)
        setSearchParams(searchParams)
        setShowResults(true)
        setRefreshQuery(uuidv4())

        // Save the query to local storage
        // create an object similar to the sample object in history-client.js
        // and save it to local storage
        const itemToHistory = {
            timestamp: new Date().toISOString(),
            vespaInstance: containerUrl,
            query: query
        }
        localStorage.setItem(uuidv4(), JSON.stringify(itemToHistory))
    }

    function handleClick(event) {
        event.preventDefault()
        runQuery()
    }

    function prettifyJsonQuery(query) {
        try {
            setQuery(JSON.stringify(JSON.parse(query), null, 2))
        } catch (_) {
        }
    }

    function addTrace() {
        try {
            const parsed = JSON.parse(query)
            if ("trace" in parsed) {
                return // don't overwrite if it's already there
            }
            parsed["tracelevel"] = 5
            parsed["trace"] = {
                "explainLevel": 1,
                "timestamps": true
            }
            setQuery(JSON.stringify(parsed, null, 2))
        } catch (_) {
        }
    }

    useEffect(() => {
        const queryField = queryFieldFromSearchParam(schema)
        const initialQuery = searchParams.has(queryField) ? searchParams.get(queryField) : defaultQuery(schema)
        setQuery(initialQuery)
        setShowResults(false)
    }, [schema])

    return <div className={"min-w-full"}>
        <Editor query={query}
                setQuery={setQuery}
                handleRunQuery={runQuery}
                handleFormatQuery={prettifyJsonQuery}
                vespaState={vespaState}/>
        <div className="form-control mb-2 flex flex-row pt-1 justify-end min-w-full">
            <a type="button"
                className="btn bg-standout-blue text-yellow-400 w-13 text-center border-none outline-none mr-1"
                data-tooltip-id="vispana-tooltip"
                data-tooltip-content="Query reference"
                data-tooltip-place="top"
                target="_blank"
                href={"https://docs.vespa.ai/en/reference/query-api-reference.html"}>
                <i className={"text-xs fas fa-question pl-1 pr-1" } />
            </a>
            <button type="button"
                className="btn bg-standout-blue text-yellow-400 w-13 text-center border-none outline-none mr-1"
                data-tooltip-id="vispana-tooltip"
                data-tooltip-content="Format Query (Cmd+Opt+L)"
                data-tooltip-place="top"
                onClick={(e) => prettifyJsonQuery(query)}>
                <i className="fas fa-code "/>
            </button>
            <button type="button"
                className="btn bg-standout-blue text-yellow-400 w-13 text-center border-none outline-none mr-1"
                data-tooltip-id="vispana-tooltip"
                data-tooltip-content="Add Trace"
                data-tooltip-place="top"
                onClick={addTrace}>
                <i className="fas fa-stopwatch pl-1 pr-1"/>
            </button>
            <button type="button"
                    className="btn bg-standout-blue text-yellow-400 w-32 btn-blue border-none outline-none"
                    data-tooltip-id="vispana-tooltip"
                    data-tooltip-content="Query (Cmd+Enter)"
                    data-tooltip-place="top"
                    onClick={handleClick}>
                    <i className={"text-xs fas fa-play pr-2"}> </i>
                    <span className="uppercase">Query</span>
            </button>
        </div>

        {showResults && <div className={"min-w-full"}>
            <EnhancedQueryResult key="query"
                         query={query}
                         defaultPageSize={10}
                         containerUrl={containerUrl}
                         schema={schema}
                         render={showResults}
                         refreshQuery={refreshQuery}
                         vispanaClient={vispanaClient}
                         useTabs={true}
                         onHeaderClick={handleHeaderClick}/>
        </div>}
        <Tooltip id="vispana-tooltip" />
    </div>
}

export function defaultQuery(schema) {
    return JSON.stringify({
        yql: `SELECT * from ${schema} where true` }, null, 2);
}

export function queryFieldFromSearchParam(schema) {
    return `${schema}Query`
}

export default EnhancedQuery 
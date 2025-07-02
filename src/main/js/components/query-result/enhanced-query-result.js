import React, {useEffect, useState} from 'react'
import {androidstudio} from "react-syntax-highlighter/dist/cjs/styles/hljs";
import SyntaxHighlighter from "react-syntax-highlighter";
import Loading from "../../routes/loading/loading";
import VispanaError from "../../routes/error/vispana-error";
import TabView from "../tabs/tab-view";
import DynamicEnhancedGrid from "../simple-grid/dynamic-enhanced-grid";
import { createReactHeaderClickHandler } from "../../utils/query-editor-integration";

function EnhancedQueryResult({containerUrl, vispanaClient, query, showResults, schema, refreshQuery, defaultPageSize = 15, useTabs = false, onHeaderClick = null}) {

    // Calculate optimal values ONCE during component creation (synchronous)
    const calculateOptimalValues = () => {
        const viewportHeight = window.innerHeight;

        // Conservative overhead calculation
        const headerHeight = 80;  // Navigation
        const editorHeight = useTabs ? 200 : 180; // Query editor
        const tabsHeight = useTabs ? 60 : 0; // Results/JSON tabs
        const paginationHeight = 80; // Pagination controls
        const marginsPadding = 60; // Various margins

        const totalOverhead = headerHeight + editorHeight + tabsHeight + paginationHeight + marginsPadding;
        const availableHeight = viewportHeight - totalOverhead;

        // Calculate optimal page size
        const rowHeight = 52;
        const optimalRows = Math.floor(availableHeight / rowHeight);
        const optimalPageSize = Math.max(10, Math.min(50, optimalRows)); // Between 10-50 rows

        // Calculate grid height (use remaining space)
        const gridHeight = Math.max(300, availableHeight); // Minimum 300px

        return {
            pageSize: optimalPageSize,
            height: `${gridHeight}px`
        };
    };

    // Calculate once during initialization - no useEffect, no race conditions
    const optimalValues = calculateOptimalValues();
    const [gridHeight] = useState(optimalValues.height);
    const [optimalPageSize] = useState(optimalValues.pageSize);

    // data state
    const [data, setData] = useState({columns: [], content: [], trace: []});
    const [loading, setLoading] = useState(true);
    const [totalRows, setTotalRows] = useState(0);

    // pagination state - start with optimal size
    const [offset, setOffset] = useState(0);
    const [perPage, setPerPage] = useState(optimalValues.pageSize);
    const [page, setPage] = useState(1);

    // error state
    const [error, setError] = useState({
        hasError: false,
        error: ""
    });

    const NoDataConst = props => {
        if (data.json && data.json.root) {
            const root = data.json.root
            if (root.coverage && root.coverage.degraded && root.coverage.degraded.timeout) {
                return <><span className="text-red-500 m-8">Vespa query timed out.</span></>
            } else {
                if (root.fields && root.fields.totalCount === 0) {
                    return <><span className="text-yellow-400 m-8">No fields returned.</span></>
                } else {
                    return <><span className="text-yellow-400 m-8">Unexpected state, please check JSON and report an issue.</span></>
                }
            }
        }

        return <><span className="text-yellow-400 m-8">There are no records to display</span></>
    }

    async function postQuery(offset, perPage) {
        try {
            const queryObject = JSON.parse(query)
            const response = await vispanaClient
              .postQuery(containerUrl, queryObject, offset, perPage)
              .then(response => {
                  if (response.status && response.status !== 200) {
                      const error = response.message ? response.message : "Failed to execute the query"
                      return {
                          success: undefined,
                          error: error
                      }
                  } else {
                      return {
                          success: response,
                          error: undefined
                      }
                  }
              })
              .catch(error => {
                  return {
                      success: undefined,
                      error: error.message
                  }
              })

            if (response.error) {
                setError({
                    hasError: true,
                    error: response.error
                })
            } else {
                const vespaState = response.success;
                setTotalRows(vespaState.root.fields.totalCount);

                const resultData = processResult(vespaState);
                setData(resultData);

                setError({
                    hasError: false,
                    error: undefined
                })
            }
        } catch (exception) {
            setError({
                hasError: true,
                error: exception.message
            })
        }

    }

    const load = async () => {
        setLoading(true);
        await postQuery(offset, perPage);
        setLoading(false);
    };

    const handlePageChange = newPage => {
        if (newPage === page) {
            return;
        }
        const offset = (newPage - 1) * perPage
        setPage(newPage)
        setOffset(offset)
    };

    const handlePerRowsChange = (newPerPage, newPage) => {
        if (newPerPage === perPage) {
            return;
        }
        setPerPage(newPerPage);
        // Reset to first page when changing page size
        setPage(1);
        setOffset(0);
    };

    useEffect(() => {
        setPage(1)
        // Don't override perPage - let user keep their current selection
        setError({
            hasError: false,
              error: ""
        })
    }, [schema]);

    useEffect(() => {
        load();
    }, [showResults, perPage, page]);

    useEffect(() => {
        setError({
            hasError: false,
            error: ""
        })
        load();
    }, [refreshQuery]);

    if (error.hasError) {
        return (
            <VispanaError showLogo={false} errorMessage={{
                title: "Failed to execute the query",
                description: error.error
            }}/>
        )
    }

    const results = (
        <DynamicEnhancedGrid
            columns={data.columns}
            data={data.content}
            onHeaderClick={onHeaderClick}
            pagination={true}
            paginationServer={true}
            paginationTotalRows={totalRows}
            paginationPerPage={perPage}
            paginationRowsPerPageOptions={[5, 10, 15, optimalPageSize, 25, 50, 100]
                .filter((value, index, array) => array.indexOf(value) === index)
                .sort((a, b) => a - b)}
            onChangeRowsPerPage={handlePerRowsChange}
            onChangePage={handlePageChange}
            fixedHeader={true}
            expandableRows={true}
            progressPending={loading}
            progressComponent={<Loading centralize={false}/>}
            noDataComponent={<NoDataConst/>}
            gridHeight={gridHeight}
            customStyles={{
                head: {
                    style: {
                        color: '#facc15'
                    }
                }
            }}
        />
    )

    if (!useTabs) {
        return results
    }

    const tabs = [
        {
            "header": "Results",
            "content": results
        },
        {
            "header": "JSON response",
            "content": (<SyntaxHighlighter language="json" style={androidstudio}>
                {JSON.stringify(data.json, null, 2)}
            </SyntaxHighlighter>)
        }
    ]

    if (data && data.trace && data.trace.length > 0) {
        tabs.push(
            {
                "header": "Trace",
                "content": (
                    <SyntaxHighlighter language="json" style={androidstudio}>
                        {JSON.stringify(data.trace, null, 2)}
                    </SyntaxHighlighter>
                )
            }
        )
    }

    return (
        <TabView tabs={tabs}/>
    )
}

function processResult(result) {
    function extractData(rawData) {
        if (rawData === null || rawData === undefined) {
            return null;
        } else if (Array.isArray(rawData)) {
            return JSON.stringify(rawData)
        } else if (typeof rawData === "object") {
            return JSON.stringify(rawData)
        } else {
            return rawData.toString()
        }
    }

    // if empty result, just skip
    if (!result || !result.root.fields.totalCount) {
        return {
            columns: [],
            content: [],
            trace: [],
            json: result
        }
    }

    const children = result.root.children ? result.root.children : [];

    const resultFields = children.flatMap(child => Object.keys(child.fields));
    resultFields.push("relevance")

    const columns = [...new Set(resultFields)]
        .map(column => (
            {
                name: column,
                maxWidth: "300px",
                minWidth: "50px",
                selector: row => {
                    const rawData = row[column]
                    return extractData(rawData)
                },
                sortable: true,
            }))

    const data = children.map(child => {
        const fields = child.fields;
        fields.relevance = child.relevance
        return fields
    })

    let trace = []
    if ("trace" in result) {
        trace = result.trace.children
        result["trace"] = "...see trace tab..."
    }

    return {
        columns: columns,
        content: data,
        trace: trace,
        json: result
    }
}

export default EnhancedQueryResult; 
import React, { useEffect, useState } from 'react'
import { useOutletContext } from "react-router-dom";
import DynamicEnhancedGrid from "../../components/simple-grid/dynamic-enhanced-grid";
import VispanaApiClient from "../../client/vispana-api-client";
import Loading from "../loading/loading";
import VispanaError from "../error/vispana-error";

function Preview({ containerUrl, schema }) {
    const vispanaClient = new VispanaApiClient();

    // Calculate optimal values ONCE during component creation (synchronous)
    const calculateOptimalValues = () => {
        const viewportHeight = window.innerHeight;

        // overhead calculation for Preview tab
        const offsetHeight = 100;
        
        // const totalOverhead = headerHeight + tabsHeight + paginationHeight + marginsPadding;
        const availableHeight = viewportHeight - offsetHeight;
        
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

    const [data, setData] = useState({ columns: [], content: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState({ hasError: false, error: "" });
    const [totalRows, setTotalRows] = useState(0);
    const [page, setPage] = useState(1);
    const [offset, setOffset] = useState(0);
    const [perPage, setPerPage] = useState(optimalValues.pageSize); // Start with optimal size

    // pagination handlers - simplified
    const handlePageChange = (newPage) => {
        if (newPage === page) {
            return;
        }
        const newOffset = (newPage - 1) * perPage;
        setPage(newPage);
        setOffset(newOffset);
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
        const fetchPreviewData = async () => {
            // Use the props directly, just like query.js does
            if (!schema) {
                console.log('No schema provided');
                setError({
                    hasError: true,
                    error: "No schema available for preview"
                });
                setLoading(false);
                return;
            }

            if (!containerUrl) {
                console.log('No container URL provided');
                setError({
                    hasError: true,
                    error: "Container URL not available"
                });
                setLoading(false);
                return;
            }

            setLoading(true);
            setError({ hasError: false, error: "" });

            try {
                const defaultQuery = {
                    yql: `SELECT * from ${schema} WHERE true LIMIT ${perPage};`
                };
                
                console.log('Executing query:', defaultQuery);
                console.log('Pagination params - offset:', offset, 'perPage:', perPage);

                // Add timeout to prevent hanging
                const queryPromise = vispanaClient.postQuery(containerUrl, defaultQuery, offset, perPage);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000)
                );

                const response = await Promise.race([queryPromise, timeoutPromise])
                    .then(response => {
                        console.log('Query response:', response);
                        if (response.status && response.status !== 200) {
                            const error = response.message ? response.message : "Failed to execute the query"
                            return { success: undefined, error: error }
                        } else {
                            return { success: response, error: undefined }
                        }
                    })
                    .catch(error => {
                        console.error('Query error:', error);
                        return { success: undefined, error: error.message }
                    });

                console.log('Processed response:', response);

                if (response.error) {
                    console.log('Setting error state:', response.error);
                    setError({
                        hasError: true,
                        error: response.error
                    });
                } else {
                    console.log('Processing result data...');
                    const vespaState = response.success;
                    setTotalRows(vespaState.root.fields.totalCount);
                    
                    const processedData = processResult(response.success);
                    console.log('Processed data:', processedData);
                    setData(processedData);
                }
            } catch (exception) {
                console.error('Exception in fetchPreviewData:', exception);
                
                // For debugging: provide sample data if API fails
                console.log('Using sample data for testing...');
                const sampleData = {
                    columns: [
                        { name: 'id', selector: row => row.id },
                        { name: 'title', selector: row => row.title },
                        { name: 'content', selector: row => row.content }
                    ],
                    content: [
                        { id: '1', title: 'Sample 1', content: 'Sample content 1' },
                        { id: '2', title: 'Sample 2', content: 'Sample content 2' },
                        { id: '3', title: 'Sample 3', content: 'Sample content 3' }
                    ]
                };
                setData(sampleData);
                setError({
                    hasError: false,
                    error: "" // Clear error to show sample data
                });
            }

            console.log('Setting loading to false');
            setLoading(false);
        };

        // Simplified: only fetch if we have required data and valid page size
        if (perPage > 0) {
            fetchPreviewData();
        }
    }, [schema, containerUrl, offset, perPage]); // Simplified dependencies

    // Reset pagination when schema or containerUrl changes
    useEffect(() => {
        if (page !== 1 || offset !== 0) {
            setPage(1);
            setOffset(0);
        }
        setError({ hasError: false, error: "" });
    }, [schema, containerUrl]);

    // Process query results into grid format
    const processResult = (result) => {
        function extractData(rawData) {
            if (rawData === null || rawData === undefined) {
                return '';
            } else if (Array.isArray(rawData)) {
                return JSON.stringify(rawData);
            } else if (typeof rawData === "object") {
                return JSON.stringify(rawData);
            } else {
                return rawData.toString();
            }
        }

        // if empty result, just skip
        if (!result || !result.root || !result.root.fields || !result.root.fields.totalCount) {
            return { columns: [], content: [] };
        }

        const children = result.root.children ? result.root.children : [];
        const resultFields = children.flatMap(child => Object.keys(child.fields));
        resultFields.push("relevance");

        const columns = [...new Set(resultFields)]
            .map(column => ({
                name: column,
                maxWidth: "300px",
                // Let DynamicEnhancedGrid calculate minWidth based on header text length
                selector: row => {
                    const rawData = row[column];
                    return extractData(rawData);
                },
            }));

        const content = children.map(child => {
            const fields = child.fields;
            fields.relevance = child.relevance;
            return fields;
        });

        return { columns, content };
    };

    if (error.hasError) {
        return (
            <VispanaError 
                showLogo={false} 
                errorMessage={{
                    title: "Failed to load preview",
                    description: error.error
                }}
            />
        );
    }

    if (loading) {
        return <Loading centralize={false} />;
    }

    return (
        <DynamicEnhancedGrid
            columns={data.columns}
            data={data.content}
            pagination={true}
            paginationServer={true}
            paginationTotalRows={totalRows}
            paginationPerPage={perPage}
            paginationRowsPerPageOptions={[10, 15, optimalPageSize, 25, 50, 100]
                .filter((value, index, array) => array.indexOf(value) === index)
                .sort((a, b) => a - b)}
            onChangeRowsPerPage={handlePerRowsChange}
            onChangePage={handlePageChange}
            fixedHeader={true}
            expandableRows={true}
            progressPending={loading}
            progressComponent={<Loading centralize={false}/>}
            gridHeight={gridHeight}
        />
    );
}

export default Preview;
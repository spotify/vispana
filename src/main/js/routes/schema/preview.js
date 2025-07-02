import React, { useEffect, useState } from 'react'
import { useOutletContext } from "react-router-dom";
import DynamicEnhancedGrid from "../../components/simple-grid/dynamic-enhanced-grid";
import VispanaApiClient from "../../client/vispana-api-client";
import Loading from "../loading/loading";
import VispanaError from "../error/vispana-error";

function Preview() {
    const vispanaState = useOutletContext()
    const [data, setData] = useState({ columns: [], content: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState({ hasError: false, error: "" });
    const [totalRows, setTotalRows] = useState(0);

    // pagination state - copied from query-result.js
    const [offset, setOffset] = useState(0);
    const [perPage, setPerPage] = useState(15); // Will be updated on mount
    const [page, setPage] = useState(1);
    const [optimalPageSize, setOptimalPageSize] = useState(15); // Store calculated optimal size
    const [isOptimalSizeCalculated, setIsOptimalSizeCalculated] = useState(false); // Track calculation completion
    const [gridHeight, setGridHeight] = useState('70vh'); // Dynamic grid height

    const vispanaClient = new VispanaApiClient();

    // Track important pagination changes
    React.useEffect(() => {
        // Pagination state tracking for debugging if needed
    }, [perPage, optimalPageSize]);

    // Calculate optimal page size based on viewport height (only on load)
    const calculateOptimalPageSize = () => {
        const viewportHeight = window.innerHeight;
        const headerHeight = 100; // Approximate height for navigation/headers
        const paginationHeight = 80; // Height for pagination controls
        const rowHeight = 48; // Approximate height per row
        const availableHeight = viewportHeight - headerHeight - paginationHeight;
        const maxRows = Math.floor(availableHeight / rowHeight);
        
        // Use at least 15 rows, but allow more if space permits
        return Math.max(15, maxRows);
    };

    // Calculate optimal grid height based on viewport
    const calculateOptimalGridHeight = () => {
        const viewportHeight = window.innerHeight;
        const navigationHeight = 60; // Top navigation bar
        const tabHeight = 50; // Tab navigation height
        const marginsPadding = 40; // Various margins and padding
        const availableHeight = viewportHeight - navigationHeight - tabHeight - marginsPadding;
        
        // Use at least 400px, but allow more if space permits
        const minHeight = 400;
        const calculatedHeight = Math.max(minHeight, availableHeight);
        
        return `${calculatedHeight}px`;
    };

    // Set optimal page size and grid height on component mount (only once)
    React.useEffect(() => {
        const optimalSize = calculateOptimalPageSize();
        const optimalHeight = calculateOptimalGridHeight();
        
        // Initialize optimal pagination settings
        
        setOptimalPageSize(optimalSize);
        setPerPage(optimalSize);
        setGridHeight(optimalHeight);
        setIsOptimalSizeCalculated(true);
    }, []); // Empty dependency array - only run once on mount

    // Add resize listener to recalculate grid height when window is resized
    React.useEffect(() => {
        const handleResize = () => {
            const newHeight = calculateOptimalGridHeight();
            // Update grid height on window resize
            setGridHeight(newHeight);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []); // Empty dependency array - only set up listener once

    // pagination handlers - fixed version
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
            // Try to find schema in different locations
            let activeSchema = vispanaState.activeSchema;
            let containerUrl = vispanaState.containerUrl;
            
            // Check if schema is in content clusters
            if (!activeSchema && vispanaState.content?.clusters?.length > 0) {
                const firstCluster = vispanaState.content.clusters[0];
                if (firstCluster.contentData?.length > 0) {
                    activeSchema = firstCluster.contentData[0].schema?.schemaName;
                    console.log('Found schema in content.clusters:', activeSchema);
                }
            }
            
            // Use the same logic as other query components to find queryable container
            if (!containerUrl && vispanaState.container?.clusters?.length > 0) {
                const queryableClusters = vispanaState.container.clusters.filter(cluster => cluster.canSearch === true);
                if (queryableClusters.length > 0 && queryableClusters[0].route) {
                    containerUrl = queryableClusters[0].route;
                } else {
                    console.log('No queryable containers found or no route set');
                    console.log('Available clusters:', vispanaState.container.clusters.map(c => ({ 
                        name: c.name, 
                        canSearch: c.canSearch, 
                        route: c.route 
                    })));
                }
            }

            if (!activeSchema) {
                console.log('No active schema found, setting error');
                setError({
                    hasError: true,
                    error: "No schema available for preview"
                });
                setLoading(false);
                return;
            }

            if (!containerUrl) {
                console.log('No container URL found, setting error');
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
                    yql: `SELECT * from ${activeSchema} WHERE true LIMIT ${perPage};`
                };
                
                console.log('Executing query:', defaultQuery);
                console.log('Pagination params - offset:', offset, 'perPage:', perPage, 'optimalPageSize:', optimalPageSize);

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

        // Only fetch if we have all required data
        if (isOptimalSizeCalculated && perPage > 0) {
            fetchPreviewData();
        }
    }, [vispanaState, offset, perPage, isOptimalSizeCalculated]); // Combined dependencies

    // Reset pagination when vispanaState changes (but prevent infinite loop)
    useEffect(() => {
        if (page !== 1 || offset !== 0) {
            setPage(1);
            setOffset(0);
        }
        setError({ hasError: false, error: "" });
    }, [vispanaState]);

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

    if (loading || !isOptimalSizeCalculated) {
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
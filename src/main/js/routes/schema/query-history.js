import React from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import {androidstudio} from "react-syntax-highlighter/dist/cjs/styles/hljs";
import HistoryClient from "../../client/history-client";
import {queryFieldFromSearchParam} from "./query";
import DynamicEnhancedGrid from "../../components/simple-grid/dynamic-enhanced-grid";

const FilterComponent = ({ filterText, onFilter}) => (
    <>
        <div style={{ display: 'flex', alignItems: 'left', minWidth: '30%' }}>
            <div className="form-control w-full">
                <div className="font-search">
                    <input id="search"
                           className="border text-sm rounded-lg block w-full p-1.5 bg-standout-blue border-gray-600 placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500 text-center input-bordered"
                           value={filterText}
                           onChange={onFilter}
                           type="text"
                           placeholder="Filter"
                           aria-label="Search Input"
                    />
                    <i className="fa fa-search"></i>
                </div>
            </div>
        </div>
    </>
);

function QueryHistory({schema, tabSelector, searchParams, setSearchParams}) {
    const [filterText, setFilterText] = React.useState('');
    const [resetPaginationToggle, setResetPaginationToggle] = React.useState(false);
    const [perPage, setPerPage] = React.useState(15); // Will be updated on mount
    const [optimalPageSize, setOptimalPageSize] = React.useState(15); // Store calculated optimal size
    const [isOptimalSizeCalculated, setIsOptimalSizeCalculated] = React.useState(false); // Track calculation completion
    const [gridHeight, setGridHeight] = React.useState('70vh'); // Dynamic grid height

    const historyClient = new HistoryClient()
    const queryHistory = historyClient.fetchHistory()
    const filteredItems = queryHistory.filter(item => {
        return item.query && item.query.toLowerCase().includes(filterText.toLowerCase())
    });

    // Calculate optimal page size based on viewport height (only on load)
    const calculateOptimalPageSize = () => {
        const viewportHeight = window.innerHeight;
        const headerHeight = 100; // Approximate height for navigation/headers
        const subHeaderHeight = 52; // Height for search filter
        const paginationHeight = 80; // Height for pagination controls
        const rowHeight = 48; // Approximate height per row
        const availableHeight = viewportHeight - headerHeight - subHeaderHeight - paginationHeight;
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
        
        console.log('QueryHistory initialization - optimal size:', optimalSize, 'height:', optimalHeight);
        
        setOptimalPageSize(optimalSize);
        setPerPage(optimalSize);
        setGridHeight(optimalHeight);
        setIsOptimalSizeCalculated(true);
    }, []); // Empty dependency array - only run once on mount

    // Add resize listener to recalculate grid height when window is resized
    React.useEffect(() => {
        const handleResize = () => {
            const newHeight = calculateOptimalGridHeight();
            console.log('QueryHistory window resized, new grid height:', newHeight);
            setGridHeight(newHeight);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []); // Empty dependency array - only set up listener once

    // Pagination handlers
    const handlePerRowsChange = async (newPerPage, page) => {
        if (newPerPage === perPage) {
            return;
        }
        setPerPage(newPerPage);
    };
    const subHeaderComponentMemo = React.useMemo(() => {
        return <FilterComponent onFilter={e => setFilterText(e.target.value)} filterText={filterText} />;
    }, [filterText, resetPaginationToggle]);



    const columns = [
        {
            name: 'Time',
            selector: row => row.timestamp,
            width: '200px', // Fixed width for Time column
            center: true,
            cell: row => (
                <div className="text-center text-gray-300 text-xs">
                    {row.timestamp}
                </div>
            ),
            sortable: false,
        },
        {
            name: 'Vespa instance',
            selector: row => row.vespaInstance,
            width: '250px', // Fixed width for Vespa instance column
            center: true,
            cell: row => (
                <div className="text-center text-gray-300 text-xs overflow-hidden text-ellipsis">
                    {row.vespaInstance}
                </div>
            ),
            sortable: false,
        },
        {
            name: 'Query',
            selector: row => row.query,
            grow: 1, // Let this column grow to fill remaining space
            minWidth: '300px', // Minimum width for Query column
            cell: row => (
                <div 
                    className="query-cell-content text-left text-gray-300 text-xs p-2 cursor-pointer hover:bg-gray-700 transition-colors"
                    onClick={() => {
                        searchParams.set(queryFieldFromSearchParam(schema), row.query)
                        setSearchParams(searchParams)
                        tabSelector(0)
                    }}
                    title={row.query}>
                    {row.query}
                </div>
            ),
            wrap: false,
            sortable: false,
        },
    ]

    const NoDataConst = props => {
        return <><span className="text-yellow-400 m-8">There are no records to display</span></>
    }

    const ExpandedComponent = ({data}) => {
        const cloneData = { ...data };
        cloneData.query = JSON.parse(cloneData.query)
        return <SyntaxHighlighter language="json" style={androidstudio}>
            {JSON.stringify(cloneData, null, 2)}
        </SyntaxHighlighter>
    };

    // Show loading state until optimal size is calculated
    if (!isOptimalSizeCalculated) {
        return <div className="text-yellow-400 p-8"></div>;
    }

    return (
        <div className="query-history-grid">
            <DynamicEnhancedGrid
                columns={columns}
                data={filteredItems}
                pagination={true}
                paginationPerPage={perPage}
                paginationRowsPerPageOptions={[10, 15, optimalPageSize, 25, 50, 100]
                    .filter((value, index, array) => array.indexOf(value) === index)
                    .sort((a, b) => a - b)}
                onChangeRowsPerPage={handlePerRowsChange}
                fixedHeader={true}
                expandableRows={true}
                expandableRowsComponent={ExpandedComponent}
                expandOnRowClicked={true}
                noDataComponent={<NoDataConst/>}

                customStyles={{
                    table: {
                        style: {
                            width: '100%',
                            minWidth: '100%',
                        },
                    },
                    tableWrapper: {
                        style: {
                            width: '100%',
                        },
                    },
                    responsiveWrapper: {
                        style: {
                            width: '100%',
                        },
                    },
                    subHeader: {
                        style: {
                            minHeight: '52px',
                            width: '100%',
                        },
                    },
                }}
                subHeader={true}
                subHeaderAlign="right"
                subHeaderWrap={true}
                subHeaderComponent={subHeaderComponentMemo}
                gridHeight={gridHeight}
                actionsColumn={false}
            />
        </div>
    )
}

export default QueryHistory;

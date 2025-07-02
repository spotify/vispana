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

    // Calculate optimal values ONCE during component creation (synchronous)
    const calculateOptimalValues = () => {
        const viewportHeight = window.innerHeight;
        
        // overhead calculation for Query History tab
        const offsetHeight = 100;
        
        // const totalOverhead = headerHeight + tabsHeight + searchFilterHeight + paginationHeight + marginsPadding;
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
    const [gridHeight] = React.useState(optimalValues.height);
    const [optimalPageSize] = React.useState(optimalValues.pageSize);

    const [filterText, setFilterText] = React.useState('');
    const [resetPaginationToggle, setResetPaginationToggle] = React.useState(false);
    const [perPage, setPerPage] = React.useState(optimalValues.pageSize); // Start with optimal size

    const historyClient = new HistoryClient()
    const queryHistory = historyClient.fetchHistory()
    const filteredItems = queryHistory.filter(item => {
        return item.query && item.query.toLowerCase().includes(filterText.toLowerCase())
    });

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
            />
        </div>
    )
}

export default QueryHistory;

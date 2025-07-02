import React, { useState, useMemo } from 'react';
import DataTable, { createTheme } from 'react-data-table-component';
import { Tooltip } from "react-tooltip";
import SyntaxHighlighter from "react-syntax-highlighter";
import { androidstudio } from "react-syntax-highlighter/dist/cjs/styles/hljs";

// Create the dark theme matching your current styling
createTheme('vispana-dark', {
    text: {
        primary: '#fff',
        secondary: '#fff',
    },
    background: {
        default: '#1f2a40', // standout-blue
    },
    context: {
        background: '#1f2a40',
        text: '#facc15', // yellow-400
    },
    divider: {
        default: '#141b2d', // darkest-blue
    },
    action: {
        button: 'rgba(0,0,0,.54)',
        hover: 'rgba(0,0,0,.08)',
        disabled: 'rgba(0,0,0,.12)',
    },
    highlightOnHover: {
        default: '#3b4f77',
        text: '#fff',
    },
    striped: {
        default: '#2c3c5a',
        text: '#fff',
    },
    selected: {
        default: '#facc15',
        text: '#fff',
    },
    sortFocus: {
        default: '#facc15',
    },
});

// Custom styles to match your current grid
const customStyles = {
    table: {
        style: {
            backgroundColor: '#1f2a40',
            border: '1px solid #26324a',
        },
    },
    header: {
        style: {
            backgroundColor: '#1f2a40',
            borderBottom: '1px solid #141b2d',
            minHeight: '56px',  // Keep original header height
            paddingLeft: '1rem',
            paddingRight: '1rem',
        },
    },
    headRow: {
        style: {
            backgroundColor: '#1f2a40',
            borderBottom: '1px solid #141b2d',
            minHeight: '52px',  // Back to original height
            width: '100%',
        },
    },
    headCells: {
        style: {
            color: '#facc15', // yellow-400
            fontSize: '14px',
            fontWeight: '500',
            padding: '1rem',  // Back to original padding
            cursor: 'pointer',
            backgroundColor: '#1f2a40',  // Ensure solid background
            position: 'relative',
            display: 'flex',
            alignItems: 'center',  // Center text vertically
            justifyContent: 'center',  // Center text horizontally
            '&:hover': {
                color: '#fff',
                backgroundColor: '#26324a',  // Slightly lighter on hover
            },
        },
    },
    cells: {
        style: {
            padding: '0.5rem',  // Keep compact cell padding
            fontSize: '12px',
            color: '#d1d5db', // gray-300
            position: 'relative',
            zIndex: 10, // Higher z-index for tooltip positioning
            display: 'flex',
            alignItems: 'center',  // Center content vertically
        },
    },
    rows: {
        style: {
            backgroundColor: '#1f2a40',
            borderBottom: '1px solid #141b2d',
            '&:not(:last-of-type)': {
                borderBottom: '1px solid #141b2d',
            },
            minHeight: '44px',  // Keep compact row height
            position: 'relative',
            zIndex: 5,
            width: '100%',
        },
        stripedStyle: {
            backgroundColor: '#2c3c5a',
        },
        highlightOnHoverStyle: {
            backgroundColor: '#3b4f77',
            border: '1px solid #facc15',
            outline: 'none',
        },
    },
    expanderRow: {
        style: {
            backgroundColor: '#1f2a40',
            borderBottom: '1px solid #141b2d',
        },
    },
    expanderCell: {
        style: {
            flex: '0 0 48px',
        },
    },
    pagination: {
        style: {
            backgroundColor: '#1f2a40',
            borderTop: '1px solid #141b2d',
            color: '#d1d5db',
            minHeight: '48px',  // Reduced from 56px
        },
        pageButtonsStyle: {
            borderRadius: '50%',
            height: '40px',
            width: '40px',
            padding: '8px',
            margin: 'px',
            cursor: 'pointer',
            transition: '0.4s',
            color: '#d1d5db',
            fill: '#d1d5db',
            backgroundColor: 'transparent',
            '&:disabled': {
                cursor: 'unset',
                color: '#6b7280',
                fill: '#6b7280',
            },
            '&:hover:not(:disabled)': {
                backgroundColor: '#3b4f77',
            },
        },
    },
};

// Status indicator component matching your current styling
const StatusIndicator = ({ processesStatus, id }) => (
    <div className="flex justify-center w-full">
        {Object.keys(processesStatus).map(processName => {
            const processData = processesStatus[processName];
            let className = "rounded-full px-1 py-1 ";
            switch (processData.toLowerCase()) {
                case 'up':
                    className += "service_up";
                    break;
                case 'down':
                    className += "service_down";
                    break;
                default:
                    className += "service_unknown";
                    break;
            }

            return (
                <div key={id + processName} className="flex pr-1">
                    <div 
                        className={className}
                        data-tooltip-id="vispana-tooltip"
                        data-tooltip-content={processName}
                        data-tooltip-place="top"
                        data-tooltip-z-index="9999"
                    />
                </div>
            );
        })}
    </div>
);

// Progress bar component matching your current styling exactly
const ProgressBar = ({ value, label }) => {
    const getProgressClass = (metric) => {
        let className = "progress ";
        if (metric > 80) {
            className += "progress-error";
        } else if (metric > 50) {
            className += "progress-warning";
        } else {
            className += "progress-success";
        }
        return className;
    };

    return (
        <div style={{ minWidth: "140px", maxWidth: "220px", margin: "auto" }}>
            <progress 
                className={getProgressClass(value)}
                data-tooltip-id="vispana-tooltip"
                data-tooltip-content={value.toFixed(2) + "%"}
                data-tooltip-place="top"
                data-tooltip-z-index="9999"
                value={value}
                max="100"
            />
        </div>
    );
};

// Distribution key component
const DistributionKey = ({ group }) => (
    <div className="flex justify-center -m-2">
        <div
            className="px-2 h-6 text-green-300 text-xs font-extrabold rounded-md flex items-center justify-center border-dashed border border-green-300 m-2"
            style={{minWidth: "80px"}}>
            Group: {group.key}
        </div>
        <div
            className="px-2 h-6 text-green-300 text-xs font-extrabold rounded-md flex items-center justify-center border-dashed border border-green-300 m-2"
            style={{minWidth: "110px"}}>
            Distribution: {group.distribution}
        </div>
    </div>
);

// Copy button component
const CopyButton = ({ data }) => {
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
            // You could add a toast notification here
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="text-yellow-400 hover:text-white transition-colors duration-200 p-1"
            data-tooltip-id="vispana-tooltip"
            data-tooltip-content="Copy row data"
            data-tooltip-place="top"
        >
            <i className="fas fa-copy text-xs" />
        </button>
    );
};

// Popup button component
const PopupButton = ({ data, onOpenPopup }) => (
    <button
        onClick={() => onOpenPopup(data)}
        className="text-yellow-400 hover:text-white transition-colors duration-200 p-1 ml-2"
        data-tooltip-id="vispana-tooltip"
        data-tooltip-content="Open in popup"
        data-tooltip-place="top"
    >
        <i className="fas fa-external-link-alt text-xs" />
    </button>
);

// Modal component for popup display
const DataModal = ({ isOpen, onClose, data, title }) => {
    // ESC key handler
    React.useEffect(() => {
        const handleEscKey = (event) => {
            if (event.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscKey);
        }

        return () => {
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50" style={{ zIndex: 10000 }}>
            <div className="bg-standout-blue border border-standout-blue rounded-lg shadow-lg max-w-4xl max-h-[90vh] w-full overflow-hidden" style={{ zIndex: 10001 }}>
                <div className="flex justify-between items-center p-4 border-b border-darkest-blue">
                    <h3 className="text-yellow-400 font-bold text-lg">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-xl"
                    >
                        ✕
                    </button>
                </div>
                <div className="overflow-auto max-h-[70vh] p-4">
                    <SyntaxHighlighter language="json" style={androidstudio}>
                        {JSON.stringify(data, null, 2)}
                    </SyntaxHighlighter>
                </div>
            </div>
        </div>
    );
};

// Expandable row component matching your current styling
const ExpandableRowComponent = ({ data }) => (
    <div className="p-4 bg-standout-blue border-t border-darkest-blue">
        <SyntaxHighlighter language="json" style={androidstudio}>
            {JSON.stringify(data, null, 2)}
        </SyntaxHighlighter>
    </div>
);

// Header component - conditional clickability
const HeaderComponent = ({ title, onHeaderClick }) => {
    const isClickable = onHeaderClick && typeof onHeaderClick === 'function';
    
    if (isClickable) {
        return (
            <div 
                onClick={() => onHeaderClick(title)}
                className="cursor-pointer hover:text-white transition-colors duration-200"
                title={`Click to insert "${title}" into query`}
                style={{ userSelect: 'none' }}
            >
                {title}
            </div>
        );
    }
    
    return <div style={{ userSelect: 'none' }}>{title}</div>;
};

// Main Enhanced Grid component
function EnhancedGrid({ 
    header, 
    data, 
    hasDistributionKey = false, 
    onHeaderClick = null,
    pagination = false,
    paginationPerPage = 10, // Default initial page size
    fixedHeader = true,
    expandableRows = true,
    showActions = true,  // New prop to control actions column
    simplified = false,   // New prop for simplified layout (no actions, no expandable)
    paginationRowsPerPageOptions = [10, 15, 20, 25, 30],  // Default pagination options
    gridHeight = null // New prop for custom height
}) {
    const [modalData, setModalData] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Debug logging
    console.log('EnhancedGrid received props:', {
        paginationPerPage,
        paginationRowsPerPageOptions,
        header
    });

    // Override settings for simplified mode
    const actualExpandableRows = simplified ? false : expandableRows;
    const actualShowActions = simplified ? false : showActions;

    const openPopup = (rowData) => {
        setModalData(rowData);
        setIsModalOpen(true);
    };

    const closePopup = () => {
        setModalData(null);
        setIsModalOpen(false);
    };

    // Define columns with responsive flex-based distribution
    const columns = useMemo(() => {
        const cols = [
            {
                name: <HeaderComponent title="Status" onHeaderClick={onHeaderClick} />,
                selector: row => row.processesStatus,
                cell: row => <StatusIndicator processesStatus={row.processesStatus} id={row.id} />,
                width: '120px',  // Increased from 80px for better spacing
                center: true,
                allowOverflow: false,
                sortable: false,
            },
            {
                name: <HeaderComponent title="Hosts" onHeaderClick={onHeaderClick} />,
                selector: row => row.host?.hostname || '',
                cell: row => (
                    <p className="overflow-ellipsis overflow-hidden text-xs text-gray-300 text-center">
                        {row.host?.hostname}
                    </p>
                ),
                // Use flex to grow but with controlled min/max
                grow: hasDistributionKey ? 2 : 3,
                minWidth: '200px',
                center: true,  // Add center alignment
                wrap: true,
                sortable: false,
            },
        ];

        if (hasDistributionKey) {
            cols.push({
                name: <HeaderComponent title="Distribution key" onHeaderClick={onHeaderClick} />,
                selector: row => row.group,
                cell: row => <DistributionKey group={row.group} />,
                grow: 1.5,  // Moderate growth
                minWidth: '200px', // Increased for "Distribution key" text
                center: true,
                wrap: true,
                sortable: false,
            });
        }

        // Metric columns with equal flex growth
        const metricConfig = {
            grow: 1,
            minWidth: '140px', // Increased for "Memory usage" text
            center: true,
            sortable: false,
        };
        
        cols.push(
            {
                name: <HeaderComponent title="CPU usage" onHeaderClick={onHeaderClick} />,
                selector: row => row.hostMetrics?.cpuUsage || 0,
                cell: row => <ProgressBar value={row.hostMetrics?.cpuUsage || 0} label="CPU" />,
                ...metricConfig,
            },
            {
                name: <HeaderComponent title="Memory usage" onHeaderClick={onHeaderClick} />,
                selector: row => row.hostMetrics?.memoryUsage || 0,
                cell: row => <ProgressBar value={row.hostMetrics?.memoryUsage || 0} label="Memory" />,
                ...metricConfig,
            },
            {
                name: <HeaderComponent title="Disk usage" onHeaderClick={onHeaderClick} />,
                selector: row => row.hostMetrics?.diskUsage || 0,
                cell: row => <ProgressBar value={row.hostMetrics?.diskUsage || 0} label="Disk" />,
                ...metricConfig,
            }
        );

        // Only add Actions column if showActions is true
        if (actualShowActions) {
            cols.push({
                name: '',
                cell: row => (
                    <div className="flex items-center">
                        <CopyButton data={row} />
                        <PopupButton data={row} onOpenPopup={openPopup} />
                    </div>
                ),
                width: '100px',
                center: true,
                ignoreRowClick: true,
                allowOverflow: true,
                button: true,
                sortable: false,
            });
        }

        return cols;
    }, [hasDistributionKey, onHeaderClick, actualShowActions]);

    return (
        <div className="w-full flex flex-col">
            <div className="text-left text-yellow-400 my-4">
                <span>{header} ({data.length})</span>
            </div>
            
            <div 
                className={gridHeight ? "" : "optimal-scroll-grid"}
                style={gridHeight ? { 
                    height: gridHeight, 
                    maxHeight: gridHeight,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                } : {}}
            >
                <DataTable
                    columns={columns}
                    data={data}
                    theme="vispana-dark"
                    customStyles={customStyles}
                    fixedHeader={fixedHeader}
                    expandableRows={actualExpandableRows}
                    expandableRowsComponent={ExpandableRowComponent}
                    expandOnRowClicked={actualExpandableRows}
                    highlightOnHover
                    striped
                    responsive
                    pagination={pagination}
                    paginationPerPage={paginationPerPage}
                    paginationRowsPerPageOptions={paginationRowsPerPageOptions}
                    noDataComponent={
                        <div className="text-yellow-400 p-8">
                            There are no records to display
                        </div>
                    }
                    sortIcon={null}
                    defaultSortAsc={false}
                    sortServer={false}
                    onSort={() => {}} // Empty function to prevent sorting
                />
            </div>

            {actualShowActions && (
                <DataModal
                    isOpen={isModalOpen}
                    onClose={closePopup}
                    data={modalData}
                    title="Row Details"
                />
            )}

            <Tooltip 
                id="vispana-tooltip" 
                style={{ 
                    zIndex: 10000,
                    position: 'fixed',
                    pointerEvents: 'none'
                }}
                place="top"
                effect="solid"
                className="react-tooltip"
            />
            

        </div>
    );
}

export default EnhancedGrid;

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
            minHeight: '56px',
            paddingLeft: '1rem',
            paddingRight: '1rem',
        },
    },
    headRow: {
        style: {
            backgroundColor: '#1f2a40',
            borderBottom: '1px solid #141b2d',
            minHeight: '52px',
        },
    },
    headCells: {
        style: {
            color: '#facc15', // yellow-400
            fontSize: '14px',
            fontWeight: '500',
            padding: '1rem',
            cursor: 'pointer',
            userSelect: 'none',
            '&:hover': {
                color: '#fff',
            },
            // Hide sorting icons
            '& div[data-column-id] div': {
                display: 'none !important',
            },
            '& svg': {
                display: 'none !important',
            },
        },
    },
    cells: {
        style: {
            padding: '0.25rem 1.5rem',
            fontSize: '12px',
            color: '#d1d5db', // gray-300
            maxWidth: '300px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
        },
    },
    rows: {
        style: {
            backgroundColor: '#1f2a40',
            borderBottom: '1px solid #141b2d',
            '&:not(:last-of-type)': {
                borderBottom: '1px solid #141b2d',
            },
            minHeight: '48px',
        },
        stripedStyle: {
            backgroundColor: '#2c3c5a',
        },
        highlightOnHoverStyle: {
            backgroundColor: '#3b4f77',
            borderBottomColor: '#facc15',
            outline: '1px solid #facc15',
        },
    },
    expanderRow: {
        style: {
            backgroundColor: '#1f2a40',
            borderBottom: '1px solid #141b2d',
            maxHeight: '400px',
            overflow: 'hidden',
        },
    },
    expanderCell: {
        style: {
            flex: '0 0 48px',
            '& > div': {
                color: '#d1d5db !important', // Match text color
                fill: '#d1d5db !important',
            },
            '& svg': {
                color: '#d1d5db !important',
                fill: '#d1d5db !important',
            },
            '& button': {
                color: '#d1d5db !important',
                '&:hover': {
                    color: '#facc15 !important', // Yellow on hover
                },
            },
        },
    },
    pagination: {
        style: {
            backgroundColor: '#1f2a40',
            borderTop: '1px solid #141b2d',
            color: '#d1d5db',
            minHeight: '56px',
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
    <div className="p-4 bg-standout-blue border-t border-darkest-blue max-h-80 overflow-auto">
        <SyntaxHighlighter language="json" style={androidstudio}>
            {JSON.stringify(data, null, 2)}
        </SyntaxHighlighter>
    </div>
);

// Custom header component for clickable headers
const ClickableHeader = ({ title, onHeaderClick }) => (
    <div 
        onClick={() => onHeaderClick && onHeaderClick(title)}
        className="cursor-pointer hover:text-white transition-colors duration-200"
        title={`Click to insert "${title}" into query`}
    >
        {title}
    </div>
);

// Data formatter utility
const formatCellData = (rawData) => {
    if (rawData === null || rawData === undefined) {
        return '';
    } else if (Array.isArray(rawData)) {
        return JSON.stringify(rawData);
    } else if (typeof rawData === "object") {
        return JSON.stringify(rawData);
    } else {
        return rawData.toString();
    }
};

// Main Dynamic Enhanced Grid component
function DynamicEnhancedGrid({ 
    header,
    columns: providedColumns = [],
    data = [],
    onHeaderClick = null,
    pagination = true,
    paginationServer = false,
    paginationTotalRows = 0,
    paginationPerPage = 15,
    paginationRowsPerPageOptions = [10, 15, 20, 25, 50],
    onChangeRowsPerPage = null,
    onChangePage = null,
    fixedHeader = true,
    expandableRows = true,
    progressPending = false,
    progressComponent = null,
    noDataComponent = null,
    customStyles: overrideStyles = {},
    gridHeight = null, // New prop for custom height
    actionsColumn = null, // Custom actions column renderer (null = default, false = no actions)
    ...otherProps
}) {
    const [modalData, setModalData] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openPopup = (rowData) => {
        setModalData(rowData);
        setIsModalOpen(true);
    };

    const closePopup = () => {
        setModalData(null);
        setIsModalOpen(false);
    };

    // Process columns to add click handlers and action buttons
    const processedColumns = useMemo(() => {
        const cols = [];
        
        // Add actions column based on actionsColumn prop
        if (actionsColumn !== false) {
            if (typeof actionsColumn === 'function') {
                // Custom actions column
                cols.push({
                    name: '',
                    cell: actionsColumn,
                    width: '50px',
                    center: true,
                    ignoreRowClick: true,
                    allowOverflow: true,
                    button: true,
                    sortable: false,
                });
            } else {
                // Default actions column
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
                    sortable: false, // Disable sorting for actions
                });
            }
        }

        // Add the rest of the columns
        const otherCols = providedColumns.map(col => {
            // Calculate minimum width based on header text length
            const headerText = col.name || '';
            const calculatedMinWidth = Math.max(
                parseInt(col.minWidth) || 50,
                headerText.length * 8 + 40 // 8px per character + padding
            );
            
                        try {
                const finalColumn = {
                    ...col,
                    name: onHeaderClick ? (
                        <ClickableHeader title={col.name} onHeaderClick={onHeaderClick} />
                    ) : col.name,
                    cell: col.cell || (row => {
                        const cellData = col.selector ? col.selector(row) : '';
                        return (
                            <div 
                                className="overflow-hidden text-ellipsis"
                                title={formatCellData(cellData)}
                            >
                                {formatCellData(cellData)}
                            </div>
                        );
                    }),
                    sortable: false,
                    // Handle explicit width settings
                    ...(col.width ? { width: col.width } : {}),
                    ...(col.grow !== undefined ? { grow: col.grow } : {}),
                    
                    // Handle minWidth: use original or calculated (whichever is larger)
                    minWidth: col.minWidth ? 
                        `${Math.max(parseInt(col.minWidth) || 0, calculatedMinWidth)}px` : 
                        `${Math.max(calculatedMinWidth, 200)}px`,
                    
                    // Handle maxWidth: if header needs more space than maxWidth, remove maxWidth constraint
                    ...(col.maxWidth && calculatedMinWidth <= parseInt(col.maxWidth) ? 
                        { maxWidth: col.maxWidth } : {}),
                    
                    // Set width for columns without explicit width or grow
                    ...(!col.width && col.grow === undefined ? {
                        width: `${Math.max(calculatedMinWidth, 200)}px`,
                    } : {}),
                };
                
                return finalColumn;
            } catch (error) {
                console.error(`Error creating column "${headerText}":`, error);
                return col; // Return original column as fallback
            }
        });

        cols.push(...otherCols);
        return cols;
    }, [providedColumns, onHeaderClick, actionsColumn]);

    // Merge custom styles
    const mergedStyles = useMemo(() => ({
        ...customStyles,
        ...overrideStyles,
    }), [overrideStyles]);

    // Ensure pagination handlers are always functions
    const safeOnChangeRowsPerPage = useMemo(() => {
        return typeof onChangeRowsPerPage === 'function' ? onChangeRowsPerPage : () => {
            console.warn('onChangeRowsPerPage handler not provided or not a function');
        };
    }, [onChangeRowsPerPage]);

    const safeOnChangePage = useMemo(() => {
        return typeof onChangePage === 'function' ? onChangePage : () => {
            console.warn('onChangePage handler not provided or not a function');
        };
    }, [onChangePage]);

    // Ensure pagination options are valid
    const safePaginationRowsPerPageOptions = useMemo(() => {
        if (!Array.isArray(paginationRowsPerPageOptions)) {
            console.warn('paginationRowsPerPageOptions is not an array, using default');
            return [10, 15, 20, 25, 50];
        }
        
        const validOptions = paginationRowsPerPageOptions
            .filter(option => typeof option === 'number' && option > 0)
            .sort((a, b) => a - b);
        
        if (validOptions.length === 0) {
            console.warn('No valid pagination options found, using default');
            return [10, 15, 20, 25, 50];
        }
        
        return validOptions;
    }, [paginationRowsPerPageOptions]);

    // Ensure pagination per page is valid
    const safePaginationPerPage = useMemo(() => {
        const perPage = typeof paginationPerPage === 'number' && paginationPerPage > 0 
            ? paginationPerPage 
            : 15;
        
        // Make sure the current perPage is in the options list
        if (!safePaginationRowsPerPageOptions.includes(perPage)) {
            console.warn(`paginationPerPage (${perPage}) not in options, using first option`);
            return safePaginationRowsPerPageOptions[0];
        }
        
        return perPage;
    }, [paginationPerPage, safePaginationRowsPerPageOptions]);

    return (
        <div className="w-full flex flex-col">
            {header && (
                <div className="text-left text-yellow-400 my-4">
                    <span>{header} ({data.length})</span>
                </div>
            )}
            
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
                    columns={processedColumns}
                    data={data}
                    theme="vispana-dark"
                    customStyles={mergedStyles}
                    fixedHeader={fixedHeader}
                    expandableRows={expandableRows}
                    expandableRowsComponent={ExpandableRowComponent}
                    expandOnRowClicked={true}
                    highlightOnHover
                    striped
                    responsive
                    pagination={pagination}
                    paginationServer={paginationServer}
                    paginationTotalRows={paginationTotalRows}
                    paginationPerPage={safePaginationPerPage}
                    paginationRowsPerPageOptions={safePaginationRowsPerPageOptions}
                    onChangeRowsPerPage={safeOnChangeRowsPerPage}
                    onChangePage={safeOnChangePage}
                    progressPending={progressPending}
                    progressComponent={progressComponent}
                    noDataComponent={noDataComponent || (
                        <div className="text-yellow-400 p-8">
                            There are no records to display
                        </div>
                    )}
                    sortIcon={null}
                    defaultSortAsc={false}
                    sortServer={false}
                    onSort={() => {}} // Empty function to prevent sorting
                    {...otherProps}
                />
            </div>

            <DataModal
                isOpen={isModalOpen}
                onClose={closePopup}
                data={modalData}
                title="Row Details"
            />

            <Tooltip id="vispana-tooltip" />
        </div>
    );
}

export default DynamicEnhancedGrid; 
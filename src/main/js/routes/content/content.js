import React from 'react'
import {useOutletContext, useNavigate, useSearchParams} from "react-router-dom";
import ReactDOMServer from 'react-dom/server';

import EnhancedGrid from "../../components/simple-grid/enhanced-grid";
import TabView from "../../components/tabs/tab-view";
import { queryFieldFromSearchParam } from "../schema/query";

function Content() {
    const vespaState = useOutletContext();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Calculate optimal values ONCE during component creation (synchronous)
    const calculateOptimalValues = () => {
        const viewportHeight = window.innerHeight;
        
        // overhead calculation for Content tab
        const offsetHeight = 450; // Higher offset due to overview cards and schema cards
        
        // const totalOverhead = navigationHeight + tabHeight + tabBarHeight + overviewHeight + schemasHeight + paginationHeight + marginsPadding;
        const availableHeight = viewportHeight - offsetHeight;
        
        // Calculate optimal page size
        const rowHeight = 52;
        const optimalRows = Math.floor(availableHeight / rowHeight);
        const optimalPageSize = Math.max(5, Math.min(50, optimalRows)); // Between 10-50 rows

        // Debug the calculation
        console.log('Content calculation debug:', {
            viewportHeight,
            offsetHeight,
            availableHeight,
            rowHeight,
            optimalRows,
            optimalPageSize
        });
        
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

    // Debug logging
    console.log('Content.js - Optimal values calculated:', {
        windowHeight: window.innerHeight,
        optimalPageSize: optimalValues.pageSize,
        gridHeight: optimalValues.height
    });

    const tabs = vespaState
        .content
        .clusters
        .map(cluster => (
            {
                "header": cluster.name,
                "content":
                    <>
                        {renderOverview(cluster.overview)}
                        {renderSchemas(cluster.contentData)}
                        {renderGrid(cluster.nodes)}
                    </>
            }
        ))

    return (<TabView tabs={tabs}></TabView>);


    function renderOverview(overview) {
        return <div className="flex-auto mt-6">
            <div style={{minWidth: "200px"}}>
                <div className="w-full max-w-sm text-center bg-standout-blue rounded-md shadow-md border border-1 "
                     style={{padding: "1.0rem", borderColor: "#26324a"}}>
                    <div className="text-yellow-400">
                        Overview
                    </div>
                    <div>
                        <p className="mt-2 text-xs text-gray-200">
                            <span>Partition groups: </span> <span className="text-gray-400">{overview.partitionGroups}</span>
                            {' | '}
                            <span>Searchable copies: </span> <span className="text-gray-400">{overview.searchableCopies}</span>
                            {' | '}
                            <span>Redundancy: </span> <span className="text-gray-400">{overview.redundancy}</span>
                        </p>
                        <p className="mt-2 text-xs">
                            <span className="font-extrabold text-yellow-400">Groups</span>
                            <div>
                                { Object
                                    .keys(overview.groupNodeCount)
                                    .map((groupKey, index, array) => {
                                        const count = overview.groupNodeCount[groupKey]
                                        return (
                                            <span key={index}>
                                                <span className="text-gray-200">{groupKey}</span>
                                                {' '}
                                                <span className="italic text-gray-400">({count})</span>
                                                {(index < array.length -1 ) ? ' | ' : ""}
                                            </span>
                                        )
                                    })}
                          </div>
                        </p>
                    </div>
                </div>
            </div>
        </div>;
    }

    function renderSchemas(contentData) {
        const formatter = Intl.NumberFormat('en', { notation: 'compact' });

        return (
            <>
                <div className="w-full overflow-x-scroll component-no-scrollbar mt-6">
                    <div className="flex w-full h-full" style={{height: "100%"}}>
                        {contentData
                        .map((data, index) => {
                            let marginRight = index === contentData.length - 1 ? "0" : "0.75rem"
                            return (
                                <div key={index} className="flex-grow flex-wrap" style={{minWidth: "200px", marginRight: marginRight}}>
                                    <div className="flex flex-col justify-center w-full max-w-sm text-center bg-standout-blue rounded-md shadow-md border border-1 border-standout-blue" style={{height: "100%", padding: "1.0rem", borderColor: "#26324a"}}>
                                        <div className="text-yellow-400 w-full">
                                            <p className="text-yellow-400 text-ellipsis overflow-hidden w-full">
                                                {data.schema.schemaName}
                                            </p>

                                        </div>

                                        <div>
                                            <p className="mt-2 text-xs">
                                                <span className="text-white">Documents: </span>
                                                <button className="text-blue-400 underline" onClick={
                                                    () => {
                                                        const elements = data.schemaDocCountPerGroup
                                                            .map((schemaDocCount, index, array) => {
                                                                const group = schemaDocCount.group
                                                                const count = schemaDocCount.documents
                                                                const diff = count - data.maxDocPerGroup
                                                                const hasDiff = diff !== 0
                                                                return <div key={index} className="flex w-full">
                                                                        <div className="flex-1 text-right" style={{minWidth: "200px", marginRight: "0.75rem"}}>
                                                                            <span className="text-yellow-400">
                                                                                Group '{group}':
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex-1 text-gray-200 text-left" style={{minWidth: "200px", marginRight: "0.75rem"}}>
                                                                            {' '} {count.toLocaleString()} {hasDiff ? <span className="text-red-400">({diff})</span> : <></> }
                                                                        </div>
                                                                    </div>
                                                            })
                                                        {/* Not an ideal way of managing modals in react. However, it was simpler than introducing more complexity
                                                            when managing another component state. If other modal components are required we should move it to
                                                            a proper place */}
                                                        document.getElementById('modal-content').innerHTML = ReactDOMServer
                                                            .renderToStaticMarkup(<span>{elements}</span>)
                                                        return document.getElementById('vispana-content-modal').showModal()
                                                    }
                                                }>
                                                    {formatter.format(data.maxDocPerGroup)}
                                                </button>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
                {/* Not an ideal way of managing modals in react. However, it was simpler than introducing more complexity
                    when managing another components state */}
                <dialog id="vispana-content-modal" className="modal">
                    <div className="modal-box text-center bg-standout-blue border" style={{borderColor: "#26324a"}}>
                        <form method="dialog">
                            {/* if there is a button in form, it will close the modal */}
                            <button className="text-gray-400 text-sm absolute right-4 top-4">✕</button>
                        </form>
                        <h3 className="text-yellow-400 font-bold text-lg">Documents by group</h3>
                        <br />
                        <h3 id="modal-content"></h3>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button>close</button>
                    </form>
                </dialog>
            </>
        )
    }

    function renderGrid(contentNodes) {
        return (
            <div className="grid-content-area">
                <EnhancedGrid 
                    header="Content nodes" 
                    data={contentNodes}
                    hasDistributionKey={true}
                    pagination={contentNodes.length > 10} // Enable pagination for large datasets
                    paginationPerPage={optimalPageSize} // Set initial page size to optimal value
                    paginationRowsPerPageOptions={[5, 10, optimalPageSize, 20, 50]
                        .filter((value, index, array) => array.indexOf(value) === index)
                        .sort((a, b) => a - b)}
                    fixedHeader={true}
                    simplified={true}
                    gridHeight={gridHeight}
                />
            </div>
        );
    }
}

export default Content;

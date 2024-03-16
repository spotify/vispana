import React from 'react'
import {useOutletContext} from "react-router-dom";
import ReactDOMServer from 'react-dom/server';

import SimpleGrid from "../../components/simple-grid/simple-grid";
import SimpleGridRow from "../../components/simple-grid/simple-grid-row";
import TabView from "../../components/tabs/tab-view";

function Content() {
    const vespaState = useOutletContext();

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
                <div className="w-full overflow-x-scroll component-no-scrollbar mt-6 pb-6">
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
        return <SimpleGrid header="Content nodes" hasDistributionKey={true}>
            {contentNodes.map(node => (<SimpleGridRow key={node.host.hostname} data={node} hasDistributionKey={true}/>))}
        </SimpleGrid>;
    }
}

export default Content;

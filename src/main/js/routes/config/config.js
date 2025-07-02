import React from 'react'
import {useOutletContext} from "react-router-dom";

import TabView from "../../components/tabs/tab-view";
import EnhancedGrid from "../../components/simple-grid/enhanced-grid";

function Config() {
    const vespaState = useOutletContext();
    const [optimalPageSize, setOptimalPageSize] = React.useState(15);
    const [isOptimalSizeCalculated, setIsOptimalSizeCalculated] = React.useState(false);
    const [gridHeight, setGridHeight] = React.useState('60vh');

    // Calculate optimal page size based on viewport height (accounting for tabs)
    const calculateOptimalPageSize = () => {
        const viewportHeight = window.innerHeight;
        const navigationHeight = 60; // Top navigation bar
        const tabHeight = 50; // Tab navigation height
        const tabBarHeight = 50; // Config cluster tab bar
        const paginationHeight = 80; // Height for pagination controls
        const marginsPadding = 60; // Various margins and padding
        const rowHeight = 48; // Approximate height per row
        
        const totalOverhead = navigationHeight + tabHeight + tabBarHeight + paginationHeight + marginsPadding;
        const availableHeight = viewportHeight - totalOverhead;
        const maxRows = Math.floor(availableHeight / rowHeight);
        
        // Use at least 15 rows, but allow more if space permits
        return Math.max(15, maxRows);
    };

    // Calculate optimal grid height based on viewport
    const calculateOptimalGridHeight = () => {
        const viewportHeight = window.innerHeight;
        const navigationHeight = 60; // Top navigation bar
        const tabHeight = 50; // Tab navigation height
        const tabBarHeight = 50; // Config cluster tab bar
        const marginsPadding = 40; // Various margins and padding
        
        const totalOverhead = navigationHeight + tabHeight + tabBarHeight + marginsPadding;
        const availableHeight = viewportHeight - totalOverhead;
        
        // Use at least 400px, but allow more if space permits
        const minHeight = 400;
        const calculatedHeight = Math.max(minHeight, availableHeight);
        
        return `${calculatedHeight}px`;
    };

    // Set optimal page size and grid height on component mount (only once)
    React.useEffect(() => {
        const optimalSize = calculateOptimalPageSize();
        const optimalHeight = calculateOptimalGridHeight();
        
        console.log('Config initialization - optimal size:', optimalSize, 'height:', optimalHeight);
        
        setOptimalPageSize(optimalSize);
        setGridHeight(optimalHeight);
        setIsOptimalSizeCalculated(true);
    }, []); // Empty dependency array - only run once on mount

    // Add resize listener to recalculate grid height when window is resized
    React.useEffect(() => {
        const handleResize = () => {
            const newHeight = calculateOptimalGridHeight();
            console.log('Config window resized, new grid height:', newHeight);
            setGridHeight(newHeight);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []); // Empty dependency array - only set up listener once

    // Show loading state until optimal size is calculated
    if (!isOptimalSizeCalculated) {
        return <div className="text-yellow-400 p-8"></div>;
    }
    const tabs = vespaState
        .config
        .clusters
        .map(cluster => {
            return {
                "header": cluster.name,
                "content":
                    <div className="grid-content-area">
                        <EnhancedGrid 
                            header="Config nodes"
                            data={cluster.nodes}
                            hasDistributionKey={false}
                            pagination={cluster.nodes.length > 10}
                            paginationRowsPerPageOptions={[10, 15, optimalPageSize, 25, 50]
                                .filter((value, index, array) => array.indexOf(value) === index)
                                .sort((a, b) => a - b)}
                            fixedHeader={true}
                            simplified={true}
                            gridHeight={gridHeight}
                        />
                    </div>
            }
        })

    return (<TabView tabs={tabs}></TabView>);
}

export default Config;

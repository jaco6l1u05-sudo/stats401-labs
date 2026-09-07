Promise.all([
    d3.csv("../data/lab5_assignment_stations.csv", d => ({
        ...d,
        daily_passengers: +d.daily_passengers
    })),

    d3.csv("../data/lab5_assignment_routes.csv", d => ({
        ...d,
        travel_time_min: +d.travel_time_min
    }))
])
.then(([stations, routes]) => {

    console.log("Number of stations:", stations.length);
    console.log("Number of routes:", routes.length);

    console.log(stations);
    console.log(routes);


    // =========================================================
    // 1. NODE-LINK VISUALIZATION
    // =========================================================

    const width = 900;
    const height = 600;
    const graphLeft = 130;
    const graphRight = 780;
    const graphCenterX = (graphLeft + graphRight) / 2;
    const svg = d3.select("#network")
        .append("svg")
        .attr("width", width)
        .attr("height", height);


    // =========================================================
    // 2. SCALES
    // =========================================================

    // District -> node color
    const districtColor = d3.scaleOrdinal()
        .domain([...new Set(stations.map(d => d.district))])
        .range(d3.schemeTableau10);


    // Route type -> link color
    const routeColor = d3.scaleOrdinal()
        .domain([...new Set(routes.map(d => d.route_type))])
        .range(d3.schemeSet2);


    // Passenger volume -> node size
    const nodeSize = d3.scaleSqrt()
        .domain(
            d3.extent(
                stations,
                d => d.daily_passengers
            )
        )
        .range([6, 22]);


    // Travel time -> link width
    const linkWidth = d3.scaleLinear()
        .domain(
            d3.extent(
                routes,
                d => d.travel_time_min
            )
        )
        .range([1.5, 6]);


    // =========================================================
    // 3. LINKS
    // =========================================================

    const link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(routes)
        .join("line")
        .attr(
            "stroke",
            d => routeColor(d.route_type)
        )
        .attr(
            "stroke-width",
            d => linkWidth(d.travel_time_min)
        )
        .attr("stroke-opacity", 0.6);


    // =========================================================
    // 4. NODES
    // =========================================================

    const node = svg.append("g")
        .attr("class", "nodes")
        .selectAll(".node")
        .data(stations)
        .join("g")
        .attr("class", "node");


    // =========================================================
    // 5. STATION SHAPES
    //
    // District       -> color
    // Passenger      -> size
    // Station type   -> shape
    // =========================================================

    node.each(function(d) {

        const g = d3.select(this);

        const size = nodeSize(
            d.daily_passengers
        );


        // Local -> circle
        if (d.station_type === "Local") {

            g.append("circle")
                .attr("r", size)
                .attr(
                    "fill",
                    districtColor(d.district)
                )
                .attr("stroke", "white")
                .attr("stroke-width", 1);


        // Transfer -> square
        } else if (d.station_type === "Transfer") {

            g.append("rect")
                .attr("x", -size)
                .attr("y", -size)
                .attr("width", size * 2)
                .attr("height", size * 2)
                .attr(
                    "fill",
                    districtColor(d.district)
                )
                .attr("stroke", "white")
                .attr("stroke-width", 1);


        // Terminal -> triangle
        } else if (d.station_type === "Terminal") {

            g.append("path")
                .attr(
                    "d",
                    d3.symbol()
                        .type(d3.symbolTriangle)
                        .size(size * size * 3)
                )
                .attr(
                    "fill",
                    districtColor(d.district)
                )
                .attr("stroke", "white")
                .attr("stroke-width", 1);
        }
    });


    // =========================================================
    // 6. STATION LABELS
    // =========================================================

    const label = svg.append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(stations)
        .join("text")
        .text(d => d.station_name)
        .attr("x", 8)
        .attr("y", 4)
        .attr("font-size", "10px")
        .attr("fill", "black")
        .attr("pointer-events", "none");


    // =========================================================
    // 7. FORCE SIMULATION
    // =========================================================

    const simulation = d3.forceSimulation(stations)

        .force(
            "link",
            d3.forceLink(routes)
                .id(d => d.id)
                .distance(90)
        )

        .force(
            "charge",
            d3.forceManyBody()
                .strength(-140)
        )

        // Keep the network in the right-hand area
        .force(
            "x",
            d3.forceX(graphCenterX)
                .strength(0.08)
        )

        .force(
            "y",
            d3.forceY(height / 2)
                .strength(0.05)
        )

        .force(
            "collision",
            d3.forceCollide()
                .radius(
                    d => nodeSize(d.daily_passengers) + 15
                )
        );

    // =========================================================
    // 8. UPDATE POSITIONS
    // =========================================================

    simulation.on("tick", () => {

        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);


        node
            .attr(
                "transform",
                d => `translate(${d.x},${d.y})`
            );


        label
            .attr("transform",
                d => `translate(${d.x},${d.y})`
            );
    });


    // =========================================================
    // 9. DRAGGING
    // =========================================================

    node.call(
        d3.drag()
            .on("start", dragStarted)
            .on("drag", dragged)
            .on("end", dragEnded)
    );


    function dragStarted(event, d) {

        if (!event.active) {
            simulation
                .alphaTarget(0.3)
                .restart();
        }

        d.fx = d.x;
        d.fy = d.y;
    }


    function dragged(event, d) {

        d.fx = event.x;
        d.fy = event.y;
    }


    function dragEnded(event, d) {

        if (!event.active) {
            simulation.alphaTarget(0);
        }

        d.fx = null;
        d.fy = null;
    }


    // =========================================================
    // 10. CONNECTION HELPER
    // =========================================================

    function isConnected(a, b) {

        return routes.some(route =>

            (
                route.source.id === a.id &&
                route.target.id === b.id
            )

            ||

            (
                route.source.id === b.id &&
                route.target.id === a.id
            )
        );
    }


    // =========================================================
    // 11. TOOLTIP
    // =========================================================

    const tooltip = d3.select("#tooltip");


    // =========================================================
    // 12. HIGHLIGHT + TOOLTIP
    // =========================================================

    node

        .on(
            "mouseover",
            function(event, d) {

                // Highlight connected nodes
                node.attr(
                    "opacity",
                    other => {

                        if (other.id === d.id) {
                            return 1;
                        }

                        if (isConnected(d, other)) {
                            return 1;
                        }

                        return 0.15;
                    }
                );


                // Highlight connected links
                link.attr(
                    "stroke-opacity",
                    route => {

                        if (
                            route.source.id === d.id ||
                            route.target.id === d.id
                        ) {
                            return 1;
                        }

                        return 0.1;
                    }
                );


                // Highlight connected labels
                label.attr(
                    "opacity",
                    other => {

                        if (other.id === d.id) {
                            return 1;
                        }

                        if (isConnected(d, other)) {
                            return 1;
                        }

                        return 0.15;
                    }
                );
            }
        )


        .on(
            "mousemove",
            function(event, d) {

                tooltip
                    .style("opacity", 1)
                    .style(
                        "left",
                        `${event.pageX + 12}px`
                    )
                    .style(
                        "top",
                        `${event.pageY + 12}px`
                    )
                    .html(`
                        <strong>${d.station_name}</strong><br>
                        District: ${d.district}<br>
                        Daily passengers:
                        ${d.daily_passengers.toLocaleString()}<br>
                        Station type: ${d.station_type}
                    `);
            }
        )


        .on(
            "mouseout",
            function() {

                node.attr("opacity", 1);

                link.attr(
                    "stroke-opacity",
                    0.6
                );

                label.attr(
                    "opacity",
                    1
                );

                tooltip
                    .style("opacity", 0);
            }
        );


    // =========================================================
    // 13. LEGEND
    // =========================================================

    const legend = svg.append("g")
        .attr("transform", "translate(20,20)");


    // District legend
    legend.append("text")
        .text("District")
        .attr("font-weight", "bold")
        .attr("y", 0);


    const districts = [...new Set(
        stations.map(d => d.district)
    )];


    districts.forEach((district, i) => {

        const g = legend.append("g")
            .attr(
                "transform",
                `translate(0, ${20 + i * 18})`
            );

        g.append("circle")
            .attr("r", 5)
            .attr("cx", 5)
            .attr(
                "fill",
                districtColor(district)
            );

        g.append("text")
            .attr("x", 15)
            .attr("y", 4)
            .attr("font-size", "10px")
            .text(district);
    });


    // Station type legend
    const stationLegendY =
        35 + districts.length * 18;


    legend.append("text")
        .text("Station type")
        .attr("font-weight", "bold")
        .attr("y", stationLegendY);


    const stationTypes = [
        "Local",
        "Transfer",
        "Terminal"
    ];


    stationTypes.forEach((type, i) => {

        const g = legend.append("g")
            .attr(
                "transform",
                `translate(0, ${
                    stationLegendY + 20 + i * 18
                })`
            );


        if (type === "Local") {

            g.append("circle")
                .attr("cx", 5)
                .attr("cy", 0)
                .attr("r", 5);

        } else if (type === "Transfer") {

            g.append("rect")
                .attr("x", 0)
                .attr("y", -5)
                .attr("width", 10)
                .attr("height", 10);

        } else if (type === "Terminal") {

            g.append("path")
                .attr(
                    "d",
                    d3.symbol()
                        .type(d3.symbolTriangle)
                        .size(90)
                );
        }


        g.append("text")
            .attr("x", 15)
            .attr("y", 4)
            .attr("font-size", "10px")
            .text(type);
    });


    // Route type legend
    const routeLegendY =
        stationLegendY +
        20 +
        stationTypes.length * 18 +
        15;


    legend.append("text")
        .text("Route type")
        .attr("font-weight", "bold")
        .attr("y", routeLegendY);


    const routeTypes = [...new Set(
        routes.map(d => d.route_type)
    )];


    routeTypes.forEach((type, i) => {

        const g = legend.append("g")
            .attr(
                "transform",
                `translate(0, ${
                    routeLegendY + 20 + i * 18
                })`
            );


        g.append("line")
            .attr("x1", 0)
            .attr("x2", 12)
            .attr("y1", 0)
            .attr("y2", 0)
            .attr(
                "stroke",
                routeColor(type)
            )
            .attr("stroke-width", 3);


        g.append("text")
            .attr("x", 18)
            .attr("y", 4)
            .attr("font-size", "10px")
            .text(type);
    });


    // =========================================================
    // 14. ADJACENCY MATRIX
    // =========================================================

    const matrixData = [];


    stations.forEach(rowNode => {

        stations.forEach(colNode => {

            const route = routes.find(r =>

                (
                    r.source.id === rowNode.id &&
                    r.target.id === colNode.id
                )

                ||

                (
                    r.source.id === colNode.id &&
                    r.target.id === rowNode.id
                )
            );


            matrixData.push({

                row: rowNode.id,

                column: colNode.id,

                connected:
                    route !== undefined &&
                    rowNode.id !== colNode.id,

                travel_time_min:
                    route
                        ? route.travel_time_min
                        : null,

                route_type:
                    route
                        ? route.route_type
                        : null
            });
        });
    });


    console.log(
        "Matrix data:",
        matrixData
    );

    console.log(
        "Matrix data length:",
        matrixData.length
    );


    // =========================================================
    // 15. MATRIX SETTINGS
    // =========================================================

    const matrixSize = 600;


    const matrixMargin = {
        top: 30,
        right: 30,
        bottom: 100,
        left: 90
    };


    const matrixWidth =
        matrixSize +
        matrixMargin.left +
        matrixMargin.right;


    const matrixHeight =
        matrixSize +
        matrixMargin.top +
        matrixMargin.bottom;


    const matrixSvg = d3.select("#network")
        .append("svg")
        .attr("width", matrixWidth)
        .attr("height", matrixHeight);


    const matrixGroup = matrixSvg
        .append("g")
        .attr(
            "transform",
            `translate(
                ${matrixMargin.left},
                ${matrixMargin.top}
            )`
        );


    // =========================================================
    // 16. MATRIX SCALES
    // =========================================================

    const matrixX = d3.scaleBand()
        .domain(
            stations.map(d => d.id)
        )
        .range([0, matrixSize])
        .padding(0.05);


    const matrixY = d3.scaleBand()
        .domain(
            stations.map(d => d.id)
        )
        .range([0, matrixSize])
        .padding(0.05);


    // =========================================================
    // 17. MATRIX COLORS
    //
    // Route type -> hue
    // Travel time -> opacity
    // =========================================================

    const matrixRouteColor =
        d3.scaleOrdinal()
            .domain(routeTypes)
            .range(d3.schemeSet2);


    const travelOpacity =
        d3.scaleLinear()
            .domain(
                d3.extent(
                    routes,
                    d => d.travel_time_min
                )
            )
            .range([0.35, 1]);


    // =========================================================
    // 18. MATRIX CELLS
    // =========================================================

    const matrixCell = matrixGroup
        .append("g")
        .selectAll("rect")
        .data(matrixData)
        .join("rect")
        .attr(
            "x",
            d => matrixX(d.column)
        )
        .attr(
            "y",
            d => matrixY(d.row)
        )
        .attr(
            "width",
            matrixX.bandwidth()
        )
        .attr(
            "height",
            matrixY.bandwidth()
        )
        .attr(
            "fill",
            d =>
                d.connected
                    ? matrixRouteColor(
                        d.route_type
                    )
                    : "white"
        )
        .attr(
            "fill-opacity",
            d =>
                d.connected
                    ? travelOpacity(
                        d.travel_time_min
                    )
                    : 1
        )
        .attr(
            "stroke",
            "#ddd"
        );


    // =========================================================
    // 19. MATRIX LABELS
    // =========================================================

    // Bottom labels
    matrixGroup
        .append("g")
        .selectAll("text")
        .data(stations)
        .join("text")
        .attr(
            "x",
            d =>
                matrixX(d.id) +
                matrixX.bandwidth() / 2
        )
        .attr(
            "y",
            matrixSize + 10
        )
        .attr(
            "text-anchor",
            "start"
        )
        .attr(
            "font-size",
            "8px"
        )
        .attr(
            "fill",
            d => districtColor(d.district)
        )
        .attr(
            "transform",
            d =>
                `rotate(
                    90,
                    ${
                        matrixX(d.id) +
                        matrixX.bandwidth() / 2
                    },
                    ${matrixSize + 10}
                )`
        )
        .text(
            d => d.station_name
        );


    // Left labels
    matrixGroup
        .append("g")
        .selectAll("text")
        .data(stations)
        .join("text")
        .attr(
            "x",
            -8
        )
        .attr(
            "y",
            d =>
                matrixY(d.id) +
                matrixY.bandwidth() / 2
        )
        .attr(
            "text-anchor",
            "end"
        )
        .attr(
            "dominant-baseline",
            "middle"
        )
        .attr(
            "font-size",
            "8px"
        )
        .attr(
            "fill",
            d => districtColor(d.district)
        )
        .text(
            d => d.station_name
        );


    // =========================================================
    // 20. MATRIX TOOLTIP
    // =========================================================

    matrixCell

        .on(
            "mouseover",
            function(event, d) {

                if (!d.connected) {
                    tooltip
                        .style("opacity", 0);
                    return;
                }


                d3.select(this)
                    .attr(
                        "stroke",
                        "black"
                    )
                    .attr(
                        "stroke-width",
                        2
                    );


                tooltip
                    .style("opacity", 1)
                    .style(
                        "left",
                        `${event.pageX + 12}px`
                    )
                    .style(
                        "top",
                        `${event.pageY + 12}px`
                    )
                    .html(`
                        <strong>
                            ${d.row} ↔ ${d.column}
                        </strong><br>
                        Route type:
                        ${d.route_type}<br>
                        Travel time:
                        ${d.travel_time_min} minutes
                    `);
            }
        )

        .on(
            "mouseout",
            function() {

                d3.select(this)
                    .attr(
                        "stroke",
                        "#ddd"
                    )
                    .attr(
                        "stroke-width",
                        1
                    );

                tooltip
                    .style("opacity", 0);
            }
        );


    // =========================================================
    // 21. MATRIX LEGEND
    // =========================================================

    const matrixLegend =
        matrixSvg.append("g")
            .attr(
                "transform",
                `translate(
                    ${matrixMargin.left},
                    ${matrixHeight - 45}
                )`
            );


    matrixLegend
        .append("text")
        .text("Matrix: color = route type, opacity = travel time")
        .attr("font-size", "11px");


    routeTypes.forEach((type, i) => {

        matrixLegend
            .append("rect")
            .attr(
                "x",
                250 + i * 100
            )
            .attr(
                "y",
                -10
            )
            .attr(
                "width",
                12
            )
            .attr(
                "height",
                12
            )
            .attr(
                "fill",
                matrixRouteColor(type)
            );


        matrixLegend
            .append("text")
            .attr(
                "x",
                268 + i * 100
            )
            .attr(
                "y",
                0
            )
            .attr(
                "font-size",
                "10px"
            )
            .text(type);
    });

});
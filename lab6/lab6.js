d3.json("../data/lab6_assignment_gdp.json").then(data => {

    console.log("Raw data:", data);

    const root = d3.hierarchy(data);

    console.log("Hierarchy:", root);

    root.sum(d => d.gdp || 0);

    console.log("World GDP:", root.value);
    console.log("All nodes:", root.descendants());

    const treeWidth = 1000;
    const treeHeight = 600;

    const treeLayout = d3.tree()
        .size([treeHeight, treeWidth]);

    treeLayout(root);


    const treeSvg = d3.select("#tree")
        .append("svg")
        .attr("width", treeWidth)
        .attr("height", treeHeight);

    treeSvg.selectAll(".link")
        .data(root.links())
        .join("line")
        .attr("class", "link")
        .attr("x1", d => d.source.y)
        .attr("y1", d => d.source.x)
        .attr("x2", d => d.target.y)
        .attr("y2", d => d.target.x)
        .attr("stroke", "black");

    const treeNodes = treeSvg.selectAll(".node")
        .data(root.descendants())
        .join("g")
        .attr("class", "node")
        .attr(
            "transform",
            d => `translate(${d.y}, ${d.x})`
        );

    treeNodes.append("circle")
        .attr("r", 5)
        .attr("fill", "steelblue");


    treeNodes.append("text")
        .attr("dx", 8)
        .attr("dy", 4)
        .text(d => d.data.name);

    const treemapWidth = 1000;
    const treemapHeight = 600;

    const treemapRoot1 = d3.hierarchy(data)
        .sum(d => d.gdp || 0)
        .sort((a, b) => b.value - a.value);


    const treemapRoot2 = d3.hierarchy(data)
        .sum(d => d.gdp || 0)
        .sort((a, b) => b.value - a.value);


    console.log("Treemap hierarchy 1:", treemapRoot1);
    console.log("Treemap hierarchy 2:", treemapRoot2);

    const statusColor = d3.scaleOrdinal()
        .domain([
            "Increase",
            "Unchanged",
            "Decrease"
        ])
        .range([
            "green",
            "gray",
            "red"
        ]);

    const treemapLayout1 = d3.treemap()
        .size([treemapWidth, treemapHeight])
        .paddingInner(2)
        .paddingOuter(4)
        .tile(d3.treemapSquarify);


    const treemapLayout2 = d3.treemap()
        .size([treemapWidth, treemapHeight])
        .paddingInner(2)
        .paddingOuter(4)
        .tile(d3.treemapBinary);


    treemapLayout1(treemapRoot1);

    treemapLayout2(treemapRoot2);

    const tooltip = d3.select("#tooltip");


    const treemapSvg1 = d3.select("#treemap1")
        .append("svg")
        .attr("width", treemapWidth)
        .attr("height", treemapHeight);


    const leaves1 = treemapRoot1.leaves();


    const cell1 = treemapSvg1
        .selectAll(".cell")
        .data(leaves1)
        .join("g")
        .attr("class", "cell")
        .attr(
            "transform",
            d => `translate(${d.x0}, ${d.y0})`
        );


    cell1.append("rect")
        .attr(
            "width",
            d => d.x1 - d.x0
        )
        .attr(
            "height",
            d => d.y1 - d.y0
        )
        .attr(
            "fill",
            d => statusColor(d.data.status)
        )
        .attr("stroke", "white");

    cell1
        .on("mouseover", function(event, d) {

            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>${d.data.name}</strong>
                    <br>
                    GDP: $${d.data.gdp} billion
                    <br>
                    Status: ${d.data.status}
                `);

        })
        .on("mousemove", function(event) {

            tooltip
                .style(
                    "left",
                    `${event.pageX + 10}px`
                )
                .style(
                    "top",
                    `${event.pageY + 10}px`
                );

        })
        .on("mouseout", function() {

            tooltip
                .style("opacity", 0);

        });



    const treemapSvg2 = d3.select("#treemap2")
        .append("svg")
        .attr("width", treemapWidth)
        .attr("height", treemapHeight);


    const leaves2 = treemapRoot2.leaves();


    const cell2 = treemapSvg2
        .selectAll(".cell")
        .data(leaves2)
        .join("g")
        .attr("class", "cell")
        .attr(
            "transform",
            d => `translate(${d.x0}, ${d.y0})`
        );


    cell2.append("rect")
        .attr(
            "width",
            d => d.x1 - d.x0
        )
        .attr(
            "height",
            d => d.y1 - d.y0
        )
        .attr(
            "fill",
            d => statusColor(d.data.status)
        )
        .attr("stroke", "white");

    cell2
        .on("mouseover", function(event, d) {

            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>${d.data.name}</strong>
                    <br>
                    GDP: $${d.data.gdp} billion
                    <br>
                    Status: ${d.data.status}
                `);

        })
        .on("mousemove", function(event) {

            tooltip
                .style(
                    "left",
                    `${event.pageX + 10}px`
                )
                .style(
                    "top",
                    `${event.pageY + 10}px`
                );

        })
        .on("mouseout", function() {

            tooltip
                .style("opacity", 0);

        });

});
Promise.all([
    d3.csv("../data/lab8_embedding_map.csv"),
    d3.csv("../data/lab8_topic_section_matrix.csv")
]).then(function(files) {

    const data = files[0];
    const matrixData = files[1];

    data.forEach(function(d) {
        d.x = +d.x;
        d.y = +d.y;
        d.word_count = +d.word_count;
        d.cluster = +d.cluster;
        d.page = +d.page;
    });

    matrixData.forEach(function(d) {
        d.count = +d.count;
    });

    const topics = [...new Set(data.map(d => d.cluster_name))];

    const sections = [...new Set(data.map(d => d.section))]
        .sort(d3.ascending);

    const colors = d3.scaleOrdinal()
        .domain(topics)
        .range(d3.schemeTableau10);

    const width = 1050;
    const height = 650;

    const margin = {
        top: 30,
        right: 30,
        bottom: 50,
        left: 55
    };

    const svg = d3.select("#map")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const g = svg.append("g");

    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.x))
        .nice()
        .range([
            margin.left,
            width - margin.right
        ]);

    const y = d3.scaleLinear()
        .domain(d3.extent(data, d => d.y))
        .nice()
        .range([
            height - margin.bottom,
            margin.top
        ]);

    const size = d3.scaleSqrt()
        .domain([
            d3.min(data, d => d.word_count),
            d3.max(data, d => d.word_count)
        ])
        .range([3, 9]);

    g.append("g")
        .attr(
            "transform",
            `translate(0,${height - margin.bottom})`
        )
        .call(d3.axisBottom(x));

    g.append("g")
        .attr(
            "transform",
            `translate(${margin.left},0)`
        )
        .call(d3.axisLeft(y));

    const points = g.selectAll(".passage")
        .data(data, d => d.passage_id)
        .join("circle")
        .attr("class", "passage")
        .attr("cx", d => x(d.x))
        .attr("cy", d => y(d.y))
        .attr("r", d => size(d.word_count))
        .attr("fill", d => colors(d.cluster_name))
        .attr("fill-opacity", 0.7)
        .attr("stroke", "white");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 10)
        .attr("text-anchor", "middle")
        .text("UMAP Dimension 1");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .text("UMAP Dimension 2");

    svg.call(
        d3.zoom()
            .scaleExtent([0.5, 10])
            .on("zoom", event => {
                g.attr("transform", event.transform);
            })
    );

    const sectionFilter = d3.select("#section-filter");
    const topicFilter = d3.select("#topic-filter");
    const search = d3.select("#search");
    const reset = d3.select("#reset-button");

    sections.forEach(section => {
        sectionFilter.append("option")
            .attr("value", section)
            .text(section);
    });

    topics.forEach(topic => {
        topicFilter.append("option")
            .attr("value", topic)
            .text(topic);
    });

    let selected = null;

    function filtered(d) {

        const query = search.property("value")
            .trim()
            .toLowerCase();

        const section = sectionFilter.property("value");
        const topic = topicFilter.property("value");

        const textMatch =
            query === "" ||
            d.text.toLowerCase().includes(query);

        const sectionMatch =
            section === "all" ||
            d.section === section;

        const topicMatch =
            topic === "all" ||
            d.cluster_name === topic;

        return textMatch && sectionMatch && topicMatch;
    }

    function update() {

        let count = 0;

        points.each(function(d) {

            const match = filtered(d);

            if (match) {
                count += 1;
            }

            d3.select(this)
                .attr("opacity", match ? 1 : 0.08);

        });

        d3.select("#filter-status")
            .text(
                `${count} of ${data.length} passages match the filters.`
            );
    }

    function showDetails(d) {

        selected = d;

        const details = d3.select("#details");

        details.html("");

        details.append("h3")
            .text(d.passage_id);

        details.append("p")
            .html(`<strong>Chapter:</strong> ${d.chapter}`);

        details.append("p")
            .html(`<strong>Section:</strong> ${d.section}`);

        details.append("p")
            .html(`<strong>Subsection:</strong> ${d.subsection || "N/A"}`);

        details.append("p")
            .html(`<strong>Page:</strong> ${d.page}`);

        details.append("p")
            .html(`<strong>Semantic Topic:</strong> ${d.cluster_name}`);

        details.append("p")
            .html(`<strong>Word Count:</strong> ${d.word_count}`);

        details.append("p")
            .html("<strong>Original Passage:</strong>");

        details.append("p")
            .text(d.text);

        details.append("h4")
            .text("5 Most Semantically Similar Passages");

        const neighbors = d.neighbor_ids
            ? d.neighbor_ids.split(",")
            : [];

        neighbors.forEach(id => {

            const neighbor = data.find(
                p => p.passage_id === id
            );

            if (!neighbor) {
                return;
            }

            const item = details.append("div")
                .attr("class", "neighbor");

            item.append("strong")
                .text(neighbor.passage_id);

            item.append("span")
                .text(
                    ` — ${neighbor.section} — ` +
                    neighbor.text.substring(0, 160) +
                    "..."
                );

            item.on("click", () => {
                showDetails(neighbor);
            });
        });

        updateSelection();
        updateMatrix();
    }

    function updateSelection() {

        points
            .attr("stroke", "white")
            .attr("stroke-width", 0.5)
            .attr("r", d => size(d.word_count));

        if (!selected) {
            return;
        }

        const neighbors = selected.neighbor_ids
            ? selected.neighbor_ids.split(",")
            : [];

        points
            .filter(d =>
                d.passage_id === selected.passage_id ||
                neighbors.includes(d.passage_id)
            )
            .attr("stroke", "#000")
            .attr("stroke-width", d =>
                d.passage_id === selected.passage_id ? 3 : 2
            )
            .attr("r", d =>
                size(d.word_count) +
                (d.passage_id === selected.passage_id ? 3 : 1)
            );
    }

    points
        .on("mouseover", function() {
            d3.select(this)
                .attr("stroke", "#000")
                .attr("stroke-width", 2);
        })
        .on("mouseout", function() {
            updateSelection();
        })
        .on("click", function(event, d) {
            showDetails(d);
        });

    search.on("input", update);

    sectionFilter.on("change", update);

    topicFilter.on("change", update);

    reset.on("click", function() {

        search.property("value", "");
        sectionFilter.property("value", "all");
        topicFilter.property("value", "all");

        selected = null;

        points
            .attr("opacity", 1)
            .attr("stroke", "white")
            .attr("stroke-width", 0.5)
            .attr("r", d => size(d.word_count));

        d3.select("#details").html(
            "<p>Click a passage to view its details.</p>"
        );

        updateMatrix();
        update();

    });

    topics.forEach(topic => {

        const item = d3.select("#topic-legend")
            .append("div")
            .attr("class", "legend-item");

        item.append("span")
            .attr("class", "legend-color")
            .style("background", colors(topic));

        item.append("span")
            .text(topic);

    });

    const matrixLookup = new Map();

    matrixData.forEach(d => {

        matrixLookup.set(
            `${d.section}|${d.cluster_name}`,
            d.count
        );

    });

    const cellWidth = 120;
    const cellHeight = 24;
    const labelWidth = 460;
    const matrixTop = 180;

    const matrixWidth =
        labelWidth +
        topics.length * cellWidth;

    const matrixHeight =
        matrixTop +
        sections.length * cellHeight;

    const matrixSvg = d3.select("#matrix")
        .append("svg")
        .attr("width", matrixWidth)
        .attr("height", matrixHeight);

    topics.forEach((topic, i) => {

        const x =
            labelWidth +
            i * cellWidth +
            cellWidth / 2;

        matrixSvg.append("text")
            .attr("x", x)
            .attr("y", matrixTop - 15)
            .attr("text-anchor", "start")
            .attr("class", "label")
            .attr(
                "transform",
                `rotate(-45, ${x}, ${matrixTop - 15})`
            )
            .text(topic);

    });

    sections.forEach((section, i) => {

        matrixSvg.append("text")
            .attr("x", labelWidth - 10)
            .attr(
                "y",
                matrixTop +
                i * cellHeight +
                cellHeight / 2
            )
            .attr("text-anchor", "end")
            .attr("dominant-baseline", "middle")
            .attr("class", "label")
            .text(section);

    });

    const matrixCells = [];

    sections.forEach(section => {

        topics.forEach(topic => {

            matrixCells.push({
                section: section,
                topic: topic,
                count:
                    matrixLookup.get(
                        `${section}|${topic}`
                    ) || 0
            });

        });

    });

    const maxCount = d3.max(
        matrixCells,
        d => d.count
    );

    const matrixColor = d3.scaleSequential()
        .domain([0, maxCount || 1])
        .interpolator(d3.interpolateBlues);

    const cells = matrixSvg.selectAll(".matrix-cell")
        .data(matrixCells)
        .join("rect")
        .attr("class", "matrix-cell")
        .attr(
            "x",
            d =>
                labelWidth +
                topics.indexOf(d.topic) *
                cellWidth
        )
        .attr(
            "y",
            d =>
                matrixTop +
                sections.indexOf(d.section) *
                cellHeight
        )
        .attr("width", cellWidth - 2)
        .attr("height", cellHeight - 2)
        .attr("fill", d =>
            d.count === 0
                ? "#f5f5f5"
                : matrixColor(d.count)
        );

    cells
        .on("mouseover", function(event, d) {

            d3.select("#tooltip")
                .style("opacity", 1)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`)
                .html(
                    `<strong>Section:</strong> ${d.section}<br>` +
                    `<strong>Topic:</strong> ${d.topic}<br>` +
                    `<strong>Count:</strong> ${d.count}`
                );

        })
        .on("mouseout", function() {

            d3.select("#tooltip")
                .style("opacity", 0);

        })
        .on("click", function(event, d) {

            const matching = data.filter(p =>
                p.section === d.section &&
                p.cluster_name === d.topic
            );

            const ids = new Set(
                matching.map(p => p.passage_id)
            );

            points
                .attr(
                    "opacity",
                    p => ids.has(p.passage_id) ? 1 : 0.08
                );

            d3.select("#details").html(
                `<p><strong>Section:</strong> ${d.section}</p>` +
                `<p><strong>Topic:</strong> ${d.topic}</p>` +
                `<p><strong>Passages:</strong> ${d.count}</p>`
            );

        });

    function updateMatrix() {

        cells
            .attr("stroke", "none");

        if (!selected) {
            return;
        }

        cells
            .filter(d =>
                d.section === selected.section &&
                d.topic === selected.cluster_name
            )
            .attr("stroke", "#000")
            .attr("stroke-width", 3);
    }

    update();

});
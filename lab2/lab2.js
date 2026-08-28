const width = 900;
const height = 550;

const margin = {
    top: 70,
    right: 150,
    bottom: 50,
    left: 100
};

const tooltip = d3.select("#tooltip");

d3.csv(
    "../data/cities_multivariate.csv",
    d => ({
        city: d.city,
        population: +d.population,
        temp_c: +d.temp_c,
        development_level: d.development_level,
        region: d.region
    })
)
.then(data => {

    console.log(data);

    // =========================
    // 1. Create SVG
    // =========================

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);


    // =========================
    // 2. Create scales
    // =========================

    // Population scale
    const populationScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.population))
        .nice()
        .range([
            height - margin.bottom,
            margin.top
        ]);


    // Temperature scale
    const tempScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.temp_c))
        .nice()
        .range([
            height - margin.bottom,
            margin.top
        ]);


    // Development level scale
    const developmentScale = d3.scalePoint()
        .domain([
            "Low",
            "Medium",
            "High"
        ])
        .range([
            height - margin.bottom,
            margin.top
        ])
        .padding(0.5);


    // =========================
    // 3. Define x positions
    // =========================

    const xPositions = {
        population: margin.left,
        temp_c: width / 2,
        development_level: width - margin.right
    };


    // =========================
    // 4. Create color scale
    // =========================

    const regions = Array.from(
        new Set(data.map(d => d.region))
    );

    const colorScale = d3.scaleOrdinal()
        .domain(regions)
        .range(d3.schemeTableau10);


    // =========================
    // 5. Draw Population axis
    // =========================

    svg.append("g")
        .attr(
            "transform",
            `translate(${xPositions.population}, 0)`
        )
        .call(d3.axisLeft(populationScale));


    // =========================
    // 6. Draw Temperature axis
    // =========================

    svg.append("g")
        .attr(
            "transform",
            `translate(${xPositions.temp_c}, 0)`
        )
        .call(d3.axisLeft(tempScale));


    // =========================
    // 7. Draw Development axis
    // =========================

    svg.append("g")
        .attr(
            "transform",
            `translate(${xPositions.development_level}, 0)`
        )
        .call(d3.axisLeft(developmentScale));


    // =========================
    // 8. Axis labels
    // =========================

    svg.append("text")
        .attr("x", xPositions.population)
        .attr("y", margin.top - 30)
        .attr("text-anchor", "middle")
        .text("Population (millions)");


    svg.append("text")
        .attr("x", xPositions.temp_c)
        .attr("y", margin.top - 30)
        .attr("text-anchor", "middle")
        .text("Temperature (°C)");


    svg.append("text")
        .attr("x", xPositions.development_level)
        .attr("y", margin.top - 30)
        .attr("text-anchor", "middle")
        .text("Development Level");


    // =========================
    // 9. Create line generator
    // =========================

    const line = d3.line();


    function path(d) {

        return line([
            [
                xPositions.population,
                populationScale(d.population)
            ],
            [
                xPositions.temp_c,
                tempScale(d.temp_c)
            ],
            [
                xPositions.development_level,
                developmentScale(d.development_level)
            ]
        ]);

    }


    // =========================
    // 10. Draw city lines
    // =========================

    svg.selectAll(".city-line")
        .data(data)
        .join("path")
        .attr("class", "city-line")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", d => colorScale(d.region))
        .attr("stroke-width", 2)
        .attr("opacity", 0.7)


        // =========================
        // 11. Mouseover
        // =========================

        .on("mouseover", function(event, d) {

            d3.select(this)
                .attr("stroke-width", 4)
                .attr("opacity", 1);

            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>${d.city}</strong><br>
                    Population: ${d.population} million<br>
                    Temperature: ${d.temp_c} °C<br>
                    Development: ${d.development_level}<br>
                    Region: ${d.region}
                `);

        })


        // =========================
        // 12. Mousemove
        // =========================

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


        // =========================
        // 13. Mouseout
        // =========================

        .on("mouseout", function() {

            d3.select(this)
                .attr("stroke-width", 2)
                .attr("opacity", 0.7);

            tooltip
                .style("opacity", 0);

        });


    // =========================
    // 14. Create legend
    // =========================

    const legend = svg.append("g")
        .attr(
            "transform",
            `translate(${width - 120}, 100)`
        );


    const legendItems = legend
        .selectAll(".legend-item")
        .data(regions)
        .join("g")
        .attr("class", "legend-item")
        .attr(
            "transform",
            (d, i) => `translate(0, ${i * 25})`
        );


    // Legend line

    legendItems.append("line")
        .attr("x1", 0)
        .attr("x2", 20)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", d => colorScale(d))
        .attr("stroke-width", 3);


    // Legend text

    legendItems.append("text")
        .attr("x", 30)
        .attr("y", 4)
        .text(d => d);

});
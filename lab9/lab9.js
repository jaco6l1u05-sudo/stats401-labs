Promise.all([
    d3.json("../data/world.geojson"),
    d3.csv("../data/lab9_gdp_2025_top50.csv", d => ({
        iso3: d.iso3,
        country: d.country,
        gdp: +d.gdp_2025_billion_usd,
        rank: +d.rank
    }))
]).then(([geoData, gdpData]) => {

    const gdpByIso = new Map(
        gdpData.map(d => [d.iso3, d])
    );

    geoData.features.forEach(feature => {
        const iso3 =
            feature.id ||
            feature.properties.code;

        const match = gdpByIso.get(iso3);

        feature.properties.iso3 = iso3;
        feature.properties.gdp =
            match ? match.gdp : null;
        feature.properties.rank =
            match ? match.rank : null;
        feature.properties.displayName =
            match
                ? match.country
                : feature.properties.name_used ||
                  feature.properties.name;
    });

    const matchedCountries = geoData.features.filter(
        d => d.properties.gdp != null
    );

    console.log(
        `${matchedCountries.length} of ${gdpData.length} GDP rows matched`
    );

    const width = 960;
    const height = 540;

    const svg = d3.select("#choropleth")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img")
        .attr("aria-label", "World map of 2025 nominal GDP");

    const mapGroup = svg.append("g");

    // Fit the world map inside the SVG
    const projection = d3.geoNaturalEarth1()
        .fitExtent(
            [[20, 30], [width - 20, height - 70]],
            geoData
        );

    const path = d3.geoPath(projection);

    // Only use countries that have GDP data when defining the scale
    const gdpValues = matchedCountries.map(d => d.properties.gdp);
    const minGDP = d3.min(gdpValues);
    const maxGDP = d3.max(gdpValues);

    // GDP is strongly skewed, so a logarithmic scale provides better contrast
    const colorScale = d3.scaleSequentialLog(
        [minGDP, maxGDP],
        d3.interpolateYlGnBu
    );

    const tooltip = d3.select("#tooltip");

    function highlightLinkedCountry(iso3) {
        d3.selectAll(
            "#choropleth path.country, #cartogram path.feature"
        )
            .filter(d => d.properties.iso3 === iso3)
            .raise()
            .attr("stroke", "#111827")
            .attr("stroke-width", 2);

        d3.select("#cartogram svg")
            .selectAll(".cartogram-legend")
            .raise();
    }

    function clearLinkedHighlight() {
        d3.selectAll(
            "#choropleth path.country, #cartogram path.feature"
        )
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 0.6);
    }

    function showCountryTooltip(event, d) {
        highlightLinkedCountry(d.properties.iso3);

        const gdpText = d.properties.gdp == null
            ? "No data"
            : `$${d3.format(",.1f")(d.properties.gdp)} billion`;

        tooltip
            .style("opacity", 1)
            .style("left", `${event.pageX + 12}px`)
            .style("top", `${event.pageY + 12}px`)
            .html(`
                <strong>${d.properties.displayName}</strong><br>
                GDP: ${gdpText}
            `);
    }

    function moveCountryTooltip(event) {
        tooltip
            .style("left", `${event.pageX + 12}px`)
            .style("top", `${event.pageY + 12}px`);
    }

    function hideCountryTooltip() {
        clearLinkedHighlight();
        tooltip.style("opacity", 0);
    }

    const countries = mapGroup.selectAll(".country")
        .data(geoData.features)
        .join("path")
        .attr("class", "country")
        .attr("data-iso", d => d.properties.iso3)
        .attr("d", path)
        .attr("fill", d =>
            d.properties.gdp == null
                ? "#e5e7eb"
                : colorScale(d.properties.gdp)
        )
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 0.6)
        .attr("vector-effect", "non-scaling-stroke");

    countries
        .on("mouseover.lab9", showCountryTooltip)
        .on("mousemove.lab9", moveCountryTooltip)
        .on("mouseout.lab9", hideCountryTooltip);

    // Zoom and pan
    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", event => {
            mapGroup.attr("transform", event.transform);
        });

    const legendWidth = 260;
    const legendHeight = 12;
    const legendX = width - legendWidth - 40;
    const legendY = height - 42;

    const defs = svg.append("defs");

    const gradient = defs.append("linearGradient")
        .attr("id", "gdp-color-gradient")
        .attr("x1", "0%")
        .attr("x2", "100%");

    gradient.selectAll("stop")
        .data(d3.range(0, 1.01, 0.1))
        .join("stop")
        .attr("offset", d => `${d * 100}%`)
        .attr("stop-color", d => {
            const value = minGDP * Math.pow(maxGDP / minGDP, d);
            return colorScale(value);
        });

    svg.append("rect")
        .attr("x", legendX)
        .attr("y", legendY)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .attr("fill", "url(#gdp-color-gradient)");

    const legendScale = d3.scaleLog()
        .domain([minGDP, maxGDP])
        .range([legendX, legendX + legendWidth]);

    svg.append("g")
        .attr("transform", `translate(0, ${legendY + legendHeight})`)
        .call(
            d3.axisBottom(legendScale)
                .ticks(4, "~s")
                .tickSize(5)
        );

    svg.append("text")
        .attr("x", legendX)
        .attr("y", legendY - 8)
        .attr("font-size", 12)
        .attr("font-weight", 600)
        .text("2025 GDP, billion USD");
    svg.call(zoom);

    // Only include the 50 countries with GDP data
    const cartogramGeoData = {
        type: "FeatureCollection",
        features: geoData.features.filter(
            d => d.properties.gdp != null
        )
    };

    // cartogram-chart requires TopoJSON
    const cartogramTopology = topojson.topology(
        {
            countries: cartogramGeoData
        },
        1e5
    );

    const cartogramElement =
        document.getElementById("cartogram");

    const cartogramProjection = d3.geoNaturalEarth1()
        .fitExtent(
            [[20, 30], [width - 20, height - 70]],
            geoData
        );

    const cartogram = new Cartogram(cartogramElement)
        .width(width)
        .height(height)
        .topoJson(cartogramTopology)
        .topoObjectName("countries")
        .projection(cartogramProjection)
        .iterations(30)
        .value(d => d.properties.gdp)
        .color(d => colorScale(d.properties.gdp))
        .label(() => null)
        .tooltipContent(() => null);

    function initializeCartogramView(attempt = 0) {
        const cartogramSvg = d3.select("#cartogram .cartogram svg");
        const cartogramCountries = cartogramSvg.selectAll("path.feature");

        if (cartogramCountries.empty()) {
            if (attempt < 120) {
                requestAnimationFrame(() =>
                    initializeCartogramView(attempt + 1)
                );
            }
            return;
        }

        cartogramSvg
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("role", "img")
            .attr("aria-label", "Cartogram of 2025 nominal GDP");

        cartogramCountries
            .attr("data-iso", d => d.properties.iso3)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 0.6)
            .attr("vector-effect", "non-scaling-stroke")
            .on("mouseover.lab9", showCountryTooltip)
            .on("mousemove.lab9", moveCountryTooltip)
            .on("mouseout.lab9", hideCountryTooltip);

        const cartogramDefs = cartogramSvg.append("defs");
        const cartogramGradient = cartogramDefs
            .append("linearGradient")
            .attr("id", "cartogram-gdp-color-gradient")
            .attr("x1", "0%")
            .attr("x2", "100%");

        cartogramGradient.selectAll("stop")
            .data(d3.range(0, 1.01, 0.1))
            .join("stop")
            .attr("offset", d => `${d * 100}%`)
            .attr("stop-color", d => {
                const value = minGDP * Math.pow(maxGDP / minGDP, d);
                return colorScale(value);
            });

        cartogramSvg.append("rect")
            .attr("class", "cartogram-legend")
            .attr("x", legendX)
            .attr("y", legendY)
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .attr("fill", "url(#cartogram-gdp-color-gradient)");

        cartogramSvg.append("g")
            .attr("class", "cartogram-legend")
            .attr("transform", `translate(0, ${legendY + legendHeight})`)
            .call(
                d3.axisBottom(legendScale.copy())
                    .ticks(4, "~s")
                    .tickSize(5)
            );

        cartogramSvg.append("text")
            .attr("class", "cartogram-legend")
            .attr("x", legendX)
            .attr("y", legendY - 8)
            .attr("font-size", 12)
            .attr("font-weight", 600)
            .text("2025 GDP, billion USD");

        const cartogramZoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", event => {
                cartogramCountries.attr("transform", event.transform);
            });

        cartogramSvg
            .on("mouseleave.lab9-tooltip", () => {
                clearLinkedHighlight();
                tooltip.style("opacity", 0);
            })
            .call(cartogramZoom);
    }

    requestAnimationFrame(() => initializeCartogramView());

}).catch(error => {
    console.error("Lab 9 data loading failed:", error);
});

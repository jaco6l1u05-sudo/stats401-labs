const DATA_PATH = "data/owid_income_inequality.csv";

const state = {
    sort: "reduction",
    region: "all",
    query: "",
    showValues: false
};

const sortLabels = {
    reduction: "largest reduction",
    disposable: "highest disposable Gini",
    market: "highest market Gini",
    country: "country name"
};

const chart = d3.select("#chart");
const tooltip = d3.select("#tooltip");
const sortSelect = d3.select("#sort-select");
const regionSelect = d3.select("#region-select");
const searchInput = d3.select("#country-search");
const labelToggle = d3.select("#label-toggle");

d3.csv(DATA_PATH, d => {
    const market = +d["Market Gini"];
    const disposable = +d["Disposable Gini"];

    return {
        country: d.Entity,
        code: d.Code,
        year: +d.Year,
        market,
        disposable,
        reduction: market - disposable,
        percentReduction: market ? (market - disposable) / market : 0,
        region: d["World region according to OWID"] || "Other / Unclassified"
    };
}).then(data => {
    const regions = [...new Set(data.map(d => d.region))].sort(d3.ascending);

    regionSelect.selectAll("option.region-option")
        .data(regions)
        .join("option")
        .attr("class", "region-option")
        .attr("value", d => d)
        .text(d => d);

    function filteredData() {
        const query = state.query.trim().toLowerCase();

        const filtered = data.filter(d => {
            const regionMatch = state.region === "all" || d.region === state.region;
            const countryMatch = !query || d.country.toLowerCase().includes(query);
            return regionMatch && countryMatch;
        });

        const comparators = {
            reduction: (a, b) => d3.descending(a.reduction, b.reduction),
            disposable: (a, b) => d3.descending(a.disposable, b.disposable),
            market: (a, b) => d3.descending(a.market, b.market),
            country: (a, b) => d3.ascending(a.country, b.country)
        };

        return filtered.sort(comparators[state.sort]);
    }

    function showTooltip(event, d) {
        tooltip
            .style("opacity", 1)
            .html(`
                <strong>${d.country}</strong>
                <dl>
                    <dt>Observation year</dt><dd>${d.year}</dd>
                    <dt>Region</dt><dd>${d.region}</dd>
                    <dt>Market Gini</dt><dd>${d.market.toFixed(3)}</dd>
                    <dt>Disposable Gini</dt><dd>${d.disposable.toFixed(3)}</dd>
                    <dt>Absolute reduction</dt><dd>${d.reduction.toFixed(3)}</dd>
                    <dt>Percent reduction</dt><dd>${d3.format(".1%")(
                        d.percentReduction
                    )}</dd>
                </dl>
            `);

        moveTooltip(event);
    }

    function moveTooltip(event) {
        const width = 250;
        const left = event.pageX + width + 30 > window.innerWidth
            ? event.pageX - width - 18
            : event.pageX + 18;

        tooltip
            .style("left", `${Math.max(12, left)}px`)
            .style("top", `${event.pageY + 14}px`);
    }

    function hideTooltip() {
        tooltip.style("opacity", 0);
    }

    function render() {
        const rows = filteredData();
        const containerWidth = document.querySelector("#chart").clientWidth;
        const width = Math.max(760, containerWidth);
        const rowHeight = 29;
        const margin = {
            top: 58,
            right: state.showValues ? 102 : 42,
            bottom: 44,
            left: 216
        };
        const height = Math.max(190, margin.top + margin.bottom + rows.length * rowHeight);

        const x = d3.scaleLinear()
            .domain([0.2, 0.75])
            .range([margin.left, width - margin.right]);

        const y = d3.scaleBand()
            .domain(rows.map(d => d.country))
            .range([margin.top, height - margin.bottom])
            .paddingInner(0.35);

        chart.selectAll("svg").remove();

        const svg = chart.append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("role", "img")
            .attr("aria-label", "Dumbbell plot comparing market and disposable Gini coefficients by country.");

        if (!rows.length) {
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", 100)
                .attr("text-anchor", "middle")
                .attr("fill", "#607077")
                .text("No countries match the current filters.");
        }

        const ticks = d3.range(0.2, 0.76, 0.1);

        svg.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(
                d3.axisBottom(x)
                    .tickValues(ticks)
                    .tickSize(-(height - margin.top - margin.bottom))
                    .tickFormat("")
            );

        svg.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${margin.top - 18})`)
            .call(d3.axisTop(x).tickValues(ticks).tickFormat(d3.format(".1f")));

        svg.append("text")
            .attr("x", margin.left)
            .attr("y", 17)
            .attr("fill", "#607077")
            .attr("font-size", 12)
            .attr("font-weight", 700)
            .text("GINI COEFFICIENT");

        svg.append("text")
            .attr("x", margin.left - 16)
            .attr("y", 17)
            .attr("text-anchor", "end")
            .attr("fill", "#607077")
            .attr("font-size", 12)
            .attr("font-weight", 700)
            .text("COUNTRY · YEAR");

        const groups = svg.selectAll("g.country-row")
            .data(rows, d => d.country)
            .join("g")
            .attr("class", "country-row")
            .attr("tabindex", 0)
            .attr("role", "group")
            .attr("aria-label", d => (
                `${d.country}, ${d.year}. Market Gini ${d.market.toFixed(3)}, ` +
                `disposable Gini ${d.disposable.toFixed(3)}, reduction ${d.reduction.toFixed(3)}.`
            ))
            .attr("transform", d => `translate(0,${y(d.country) + y.bandwidth() / 2})`)
            .on("mouseenter focus", showTooltip)
            .on("mousemove", moveTooltip)
            .on("mouseleave blur", hideTooltip);

        groups.append("text")
            .attr("class", "country-label")
            .attr("x", margin.left - 48)
            .attr("y", 4)
            .attr("text-anchor", "end")
            .text(d => d.country);

        groups.append("text")
            .attr("class", "year-label")
            .attr("x", margin.left - 12)
            .attr("y", 4)
            .attr("text-anchor", "end")
            .text(d => d.year);

        groups.append("line")
            .attr("class", "connector")
            .attr("x1", d => x(d.disposable))
            .attr("x2", d => x(d.market));

        groups.append("circle")
            .attr("class", "dot-disposable")
            .attr("cx", d => x(d.disposable))
            .attr("r", 5.5);

        groups.append("circle")
            .attr("class", "dot-market")
            .attr("cx", d => x(d.market))
            .attr("r", 5.5);

        if (state.showValues) {
            groups.append("text")
                .attr("class", "value-label")
                .attr("x", d => x(d.disposable) - 8)
                .attr("y", 4)
                .attr("text-anchor", "end")
                .text(d => d.disposable.toFixed(3));

            groups.append("text")
                .attr("class", "value-label")
                .attr("x", d => x(d.market) + 8)
                .attr("y", 4)
                .text(d => d.market.toFixed(3));
        }

        const median = d3.median(rows, d => d.reduction);
        d3.select("#country-count").text(rows.length);
        d3.select("#median-reduction").text(median == null ? "—" : median.toFixed(3));

        const filters = [];
        if (state.region !== "all") filters.push(state.region);
        if (state.query) filters.push(`matching “${state.query}”`);

        const filterText = filters.length ? ` Showing ${filters.join(", ")}.` : "";
        d3.select("#chart-status")
            .text(`Sorted by ${sortLabels[state.sort]}.${filterText}`);
    }

    sortSelect.on("change", function() {
        state.sort = this.value;
        render();
    });

    regionSelect.on("change", function() {
        state.region = this.value;
        render();
    });

    searchInput.on("input", function() {
        state.query = this.value;
        render();
    });

    labelToggle.on("change", function() {
        state.showValues = this.checked;
        render();
    });

    d3.select("#reset-button").on("click", function() {
        state.sort = "reduction";
        state.region = "all";
        state.query = "";
        state.showValues = false;

        sortSelect.property("value", state.sort);
        regionSelect.property("value", state.region);
        searchInput.property("value", "");
        labelToggle.property("checked", false);
        render();
    });

    let resizeTimer;
    window.addEventListener("resize", () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(render, 120);
    });

    render();
}).catch(error => {
    chart.html(`
        <p class="load-error">
            The visualization data could not be loaded. Run this page from a local web server.
        </p>
    `);
    console.error(error);
});

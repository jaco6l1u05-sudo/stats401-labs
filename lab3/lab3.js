d3.csv("../data/earthquakes.csv").then(data => {

    data.forEach(d => {
        d.magnitude = +d.magnitude;
        d.depth_km = +d.depth_km;
        d.longitude = +d.longitude;
        d.latitude = +d.latitude;
        d.tsunami = +d.tsunami;
        d.felt_reports = +d.felt_reports;
        d.significance = +d.significance;
    });

    const columns = data.columns;

    let currentSortColumn = null;
    let ascending = true;

    const table = d3.select("#data-table");

    const header = table
        .select("thead")
        .append("tr");

    header.selectAll("th")
        .data(columns)
        .join("th")
        .text(d => d)
        .style("cursor", "pointer")
        .on("click", function(event, column) {

            if (currentSortColumn === column) {
                ascending = !ascending;
            } else {
                currentSortColumn = column;
                ascending = true;
            }

            data.sort((a, b) =>
                ascending
                    ? d3.ascending(a[column], b[column])
                    : d3.descending(a[column], b[column])
            );

            updateRows();
        });

    function updateRows() {

        const rows = table
            .select("tbody")
            .selectAll("tr")
            .data(data);

        rows.join("tr")
            .selectAll("td")
            .data(row =>
                columns.map(column => row[column])
            )
            .join("td")
            .text(d => d);
    }

    updateRows();

});

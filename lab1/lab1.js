async function loadData() {

    const data = await d3.csv(
        "../data/students.csv",
        d => ({
            name: d.name,
            score: +d.score
        })
    );

    console.log(data);

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", 800)
        .attr("height", 500);

    svg.append("text")
        .attr("x", 400)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .attr("class", "chart-title")
        .text("Student Scores");

    svg.selectAll("rect")
        .data(data)
        .join("rect")
        .attr("class", "bar")
        .attr("x", (d, i) => 40 + i * 90)
        .attr("y", d => 450 - d.score * 4)
        .attr("width", 30)
        .attr("height", d => d.score * 4);

    svg.selectAll("text.label")
        .data(data)
        .join("text")
        .attr("class", "label")
        .attr("x", (d, i) => 40 + i * 90 + 15)
        .attr("y", 475)
        .attr("text-anchor", "middle")
        .text(d => `${d.name}: ${d.score}`);
}

loadData();
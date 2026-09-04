const margin = { top: 40, right: 30, bottom: 70, left: 70 };
const width = 1000 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

d3.csv("../data/lab4_weekly_sentiment.csv").then(data => {

    data.forEach(d => {
        d.week = new Date(d.week);
        d.avg_sentiment = +d.avg_sentiment;
        d.tweet_count = +d.tweet_count;
        d.avg_retweets = +d.avg_retweets;
        d.avg_favorites = +d.avg_favorites;
    });

    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.week))
        .range([0, width]);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(
            d3.axisBottom(x)
                .ticks(10)
                .tickFormat(d3.timeFormat("%b %Y"))
        )
        .selectAll("text")
        .attr("transform", "rotate(-35)")
        .style("text-anchor", "end");

    const y = d3.scaleLinear()
        .domain([
            d3.min(data, d => d.avg_sentiment) - 0.05,
            d3.max(data, d => d.avg_sentiment) + 0.05
        ])
        .range([height, 0]);

    svg.append("g")
        .call(d3.axisLeft(y));

    svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y(0))
        .attr("y2", y(0))
        .attr("stroke", "gray")
        .attr("stroke-dasharray", "5,5");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 65)
        .attr("text-anchor", "middle")
        .text("Week");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .text("Average Sentiment Score");

    const r = d3.scaleSqrt()
        .domain([0, d3.max(data, d => d.tweet_count)])
        .range([3, 12]);

    const tooltip = d3.select("#tooltip");

    svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.week))
        .attr("cy", d => y(d.avg_sentiment))
        .attr("r", d => r(d.tweet_count))
        .attr("fill", "steelblue")
        .attr("opacity", 0.75)
        .on("mouseover", function(event, d) {

            d3.select(this)
                .attr("opacity", 1);

            tooltip
                .style("display", "block")
                .html(`
                    <strong>${d3.timeFormat("%b %d, %Y")(d.week)}</strong><br>
                    Average sentiment:
                    ${d.avg_sentiment.toFixed(3)}<br>
                    Tweets:
                    ${d.tweet_count}<br>
                    Average retweets:
                    ${d.avg_retweets.toFixed(0)}
                `);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 30}px`);
        })
        .on("mouseout", function() {

            d3.select(this)
                .attr("opacity", 0.75);

            tooltip.style("display", "none");
        });

    // Connect weekly observations
    const line = d3.line()
        .x(d => x(d.week))
        .y(d => y(d.avg_sentiment));

    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", line);

}).catch(error => {
    console.error("Error loading data:", error);
});
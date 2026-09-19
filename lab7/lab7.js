d3.csv(
    "../data/lab7_assignment_companies.csv"
).then(companies => {

    d3.csv(
        "../data/lab7_assignment_transactions_60days.csv",
        d => ({
            date: d3.timeParse("%Y-%m-%d")(d.date),
            day: +d.day,

            sourceId: d.source,
            targetId: d.target,

            amount_usd: +d.amount_usd,
            transaction_type: d.transaction_type,
            transaction_count: +d.transaction_count
        })
    ).then(transactions => {

        console.log("Companies:", companies);
        console.log("Transactions:", transactions);
        const width = 800;
        const height = 450;

        let currentDay = 1;
        let animationTimer = null;

        const svg = d3.select("#network")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        const tooltip = d3.select("#tooltip");

        const sectors = Array.from(
            new Set(companies.map(d => d.sector))
        );

        const sectorColor = d3.scaleOrdinal()
            .domain(sectors)
            .range([
                "#0072B2",  // blue
                "#E69F00",  // orange
                "#009E73",  // bluish green
                "#D55E00",  // vermillion
                "#CC79A7",  // reddish purple
                "#F0E442",  // yellow
                "#56B4E9",  // sky blue
                "#000000"   // black
            ]);

        const legend = svg.append("g")
            .attr("class", "legend")
            .attr(
                "transform",
                `translate(${width - 150}, 20)`
            );

        legend.append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("font-weight", "bold")
            .text("Sector");

        sectors.forEach((sector, i) => {

            const row = legend.append("g")
                .attr(
                    "transform",
                    `translate(0, ${20 + i * 25})`
                );

            row.append("circle")
                .attr("r", 7)
                .attr("fill", sectorColor(sector));

            row.append("text")
                .attr("x", 15)
                .attr("y", 4)
                .style("font-size", "12px")
                .text(sector);

        });
        const node = svg.selectAll(".node")
            .data(companies)
            .join("circle")
            .attr("class", "node")
            .attr("r", 10)
            .attr("fill", d => sectorColor(d.sector));

        const volumeByDay = new Map();

        transactions.forEach(d => {

            if (!volumeByDay.has(d.day)) {
                volumeByDay.set(d.day, new Map());
            }

            const dayVolume = volumeByDay.get(d.day);


            if (!dayVolume.has(d.sourceId)) {
                dayVolume.set(d.sourceId, 0);
            }

            if (!dayVolume.has(d.targetId)) {
                dayVolume.set(d.targetId, 0);
            }

            dayVolume.set(
                d.sourceId,
                dayVolume.get(d.sourceId) + d.amount_usd
            );

            dayVolume.set(
                d.targetId,
                dayVolume.get(d.targetId) + d.amount_usd
            );

        });

        let maxVolume = 0;

        volumeByDay.forEach(dayVolume => {

            dayVolume.forEach(volume => {

                if (volume > maxVolume) {
                    maxVolume = volume;
                }

            });

        });

        console.log(
            "Maximum company volume:",
            maxVolume
        );

        const radiusScale = d3.scaleSqrt()
            .domain([0, maxVolume])
            .range([6, 20]);


        node
            .on("mouseover", function(event, d) {

                const dayVolume =
                    volumeByDay.get(currentDay);

                const volume =
                    dayVolume?.get(d.id) || 0;


                tooltip
                    .style("opacity", 1)
                    .html(`
                        <strong>${d.company_name}</strong><br>
                        Sector: ${d.sector}<br>
                        Region: ${d.region}<br>
                        Transaction volume:
                        $${volume.toFixed(2)}
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


        let link;

        const simulation = d3.forceSimulation(companies)

            .force(
                "link",
                d3.forceLink()
                    .id(d => d.id)
                    .distance(100)
                    .strength(1)
            )

            .force(
                "charge",
                d3.forceManyBody()
                    .strength(-120)
            )

            .force(
                "center",
                d3.forceCenter(
                    width / 2,
                    height / 2
                )
            )

            .force(
                "x",
                d3.forceX(width / 2)
                    .strength(0.08)
            )

            .force(
                "y",
                d3.forceY(height / 2)
                    .strength(0.08)
            );


        function showDay(day) {

            currentDay = day;

            console.log(
                "Showing day:",
                day
            );


            const currentLinks = transactions
                .filter(d => d.day === day)
                .map(d => ({
                    ...d,

                    // These are used by D3 forceLink
                    source: d.sourceId,
                    target: d.targetId
                }));


            console.log(
                "Current links:",
                currentLinks
            );

            const volumeByCompany = new Map(
                companies.map(d => [d.id, 0])
            );


            currentLinks.forEach(d => {

                volumeByCompany.set(
                    d.sourceId,
                    volumeByCompany.get(d.sourceId)
                        + d.amount_usd
                );

                volumeByCompany.set(
                    d.targetId,
                    volumeByCompany.get(d.targetId)
                        + d.amount_usd
                );

            });


            console.log(
                "Volume by company:",
                volumeByCompany
            );

            node
                .transition()
                .duration(300)
                .attr(
                    "r",
                    d => radiusScale(
                        volumeByCompany.get(d.id)
                    )
                );

            link = svg.selectAll(".link")
                .data(
                    currentLinks,
                    d => `${d.sourceId}-${d.targetId}`
                )
                .join(

                    enter => enter
                        .append("line")
                        .attr("class", "link")
                        .attr("stroke", "#999")
                        .attr("stroke-width", 2)
                        .attr("opacity", 0)
                        .call(enter =>
                            enter
                                .transition()
                                .duration(400)
                                .attr("opacity", 1)
                        ),

                    update => update
                        .attr("stroke", "#999")
                        .attr("stroke-width", 2)
                        .transition()
                        .duration(200)
                        .attr("opacity", 1),

                    exit => exit
                        .transition()
                        .duration(400)
                        .attr("opacity", 0)
                        .remove()
                );


            link
                .on("mouseover", function(event, d) {

                    tooltip
                        .style("opacity", 1)
                        .html(`
                            <strong>
                                ${d.source.id} ↔ ${d.target.id}
                            </strong><br>
                            Amount:
                            $${d.amount_usd.toFixed(2)}<br>
                            Type:
                            ${d.transaction_type}<br>
                            Transaction count:
                            ${d.transaction_count}
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

            simulation
                .force("link")
                .links(currentLinks);

            simulation
                .alpha(1)
                .restart();

            d3.select("#dayLabel")
                .text(`Day ${day}`);

        }

        simulation.on("tick", () => {

            companies.forEach(d => {

                d.x = Math.max(
                    25,
                    Math.min(
                        width - 25,
                        d.x
                    )
                );

                d.y = Math.max(
                    25,
                    Math.min(
                        height - 25,
                        d.y
                    )
                );

            });

            if (link) {

                link
                    .attr(
                        "x1",
                        d => d.source.x
                    )
                    .attr(
                        "y1",
                        d => d.source.y
                    )
                    .attr(
                        "x2",
                        d => d.target.x
                    )
                    .attr(
                        "y2",
                        d => d.target.y
                    );

            }

            node
                .attr(
                    "cx",
                    d => d.x
                )
                .attr(
                    "cy",
                    d => d.y
                );

        });

        d3.select("#play")
            .on("click", function() {

                if (animationTimer !== null) {
                    return;
                }


                animationTimer = d3.interval(() => {

                    if (currentDay >= 60) {

                        animationTimer.stop();

                        animationTimer = null;

                        return;
                    }


                    currentDay += 1;

                    d3.select("#daySlider")
                        .property(
                            "value",
                            currentDay
                        );

                    showDay(currentDay);

                }, 800);

            });

        d3.select("#pause")
            .on("click", function() {

                if (animationTimer !== null) {

                    animationTimer.stop();

                    animationTimer = null;

                }

            });

        d3.select("#reset")
            .on("click", function() {

                if (animationTimer !== null) {

                    animationTimer.stop();

                    animationTimer = null;

                }


                d3.select("#daySlider")
                    .property("value", 1);


                showDay(1);

            });

        d3.select("#daySlider")
            .on("input", function() {

                const day = +this.value;

                showDay(day);

            });

        showDay(1);

    });

});
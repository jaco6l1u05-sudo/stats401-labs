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

    const width = 960;
    const height = 540;
    const tooltip = d3.select("#tooltip");
    const voiceHeardStatus = d3.select("#voice-heard-status");
    const status = d3.select("#interaction-status");
    const gestureStatus = d3.select("#gesture-status");
    let selectedIso = null;
    let selectedRankIndex = -1;
    let gestureStream = null;
    let gestureTimer = null;
    let previousGestureFrame = null;
    let lastGestureTime = 0;
    let gestureStartX = null;
    let gestureState = "idle";
    let stableFrameCount = 0;

    const countryOptions = d3.select("#country-options");
    countryOptions.selectAll("option")
        .data(matchedCountries)
        .join("option")
        .attr("value", d => d.properties.displayName);

    const rankedCountries = matchedCountries
        .slice()
        .sort((a, b) => a.properties.rank - b.properties.rank);

    function updateVoiceHeard(message) {
        voiceHeardStatus
            .classed("active", Boolean(message))
            .text(message || "");
    }

    function updateStatus(message) {
        status.text(message);
    }

    const svg = d3.select("#choropleth")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img")
        .attr("aria-label", "World map of 2025 nominal GDP");

    const mapGroup = svg.append("g");

    const projection = d3.geoNaturalEarth1()
        .fitExtent(
            [[20, 30], [width - 20, height - 70]],
            geoData
        );

    const path = d3.geoPath(projection);

    const gdpValues = matchedCountries.map(d => d.properties.gdp);
    const minGDP = d3.min(gdpValues);
    const maxGDP = d3.max(gdpValues);

    const colorScale = d3.scaleSequentialLog(
        [minGDP, maxGDP],
        d3.interpolateYlGnBu
    );

    function applySelectedHighlight() {
        d3.selectAll("#choropleth path.country, #cartogram path.feature")
            .attr("stroke", d =>
                d.properties.iso3 === selectedIso ? "#ef4444" : "#ffffff"
            )
            .attr("stroke-width", d =>
                d.properties.iso3 === selectedIso ? 3 : 0.6
            );

        d3.selectAll("#choropleth path.country, #cartogram path.feature")
            .filter(d => d.properties.iso3 === selectedIso)
            .raise();

        d3.select("#cartogram svg")
            .selectAll(".cartogram-legend")
            .raise();
    }

    function highlightLinkedCountry(iso3) {
        d3.selectAll(
            "#choropleth path.country, #cartogram path.feature"
        )
            .filter(d => d.properties.iso3 === iso3)
            .raise()
            .attr("stroke", iso3 === selectedIso ? "#ef4444" : "#111827")
            .attr("stroke-width", iso3 === selectedIso ? 3 : 2);

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

        if (selectedIso) {
            applySelectedHighlight();
        }
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

    function normalizeCountryName(value) {
        return value
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9 ]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    const countryAliases = new Map([
        ["america", "USA"],
        ["united states of america", "USA"],
        ["us", "USA"],
        ["usa", "USA"],
        ["uk", "GBR"],
        ["britain", "GBR"],
        ["great britain", "GBR"],
        ["south korea", "KOR"],
        ["korea", "KOR"],
        ["russia", "RUS"],
        ["turkey", "TUR"],
        ["turkiye", "TUR"],
        ["iran", "IRN"],
        ["vietnam", "VNM"],
        ["uae", "ARE"],
        ["united arab emirates", "ARE"]
    ]);

    function selectCountryByQuery(query, source = "text") {
        const cleaned = normalizeCountryName(query);

        if (!cleaned) {
            if (source === "text") {
                updateVoiceHeard(null);
            }
            updateStatus("Enter or say a country name first.");
            return;
        }

        if (source === "voice") {
            updateVoiceHeard(`Heard: "${query}"`);
        }

        if (source === "text") {
            updateVoiceHeard(null);
        }

        const aliasIso = countryAliases.get(cleaned);

        const match = matchedCountries.find(d =>
            d.properties.iso3 === aliasIso
        ) || matchedCountries.find(d =>
            normalizeCountryName(d.properties.displayName) === cleaned
        ) || matchedCountries.find(d =>
            normalizeCountryName(d.properties.displayName).includes(cleaned)
        ) || matchedCountries.find(d =>
            cleaned.includes(normalizeCountryName(d.properties.displayName))
        );

        if (!match) {
            selectedIso = null;
            clearLinkedHighlight();
            updateStatus(`No top-50 GDP country matched "${query}". Try another name.`);
            return;
        }

        selectedIso = match.properties.iso3;
        selectedRankIndex = rankedCountries.findIndex(
            d => d.properties.iso3 === selectedIso
        );
        applySelectedHighlight();

        const selectedText =
            `Selected ${match.properties.displayName}: rank #${match.properties.rank}, GDP $${d3.format(",.1f")(match.properties.gdp)} billion.`;

        updateStatus(selectedText);

        d3.select("#country-search").property("value", match.properties.displayName);
    }

    function selectCountryByRankOffset(offset, source = "keyboard") {
        if (!rankedCountries.length) {
            return;
        }

        const currentIndex = selectedRankIndex >= 0 ? selectedRankIndex : 0;
        selectedRankIndex =
            (currentIndex + offset + rankedCountries.length) %
            rankedCountries.length;

        const countryName = rankedCountries[selectedRankIndex].properties.displayName;

        if (source === "gesture") {
            gestureStatus.text(`Detected: ${offset > 0 ? "Right swipe" : "Left swipe"}.`);
        }

        selectCountryByQuery(countryName, "rank");
    }

    function resetSelection() {
        selectedIso = null;
        selectedRankIndex = -1;
        d3.select("#country-search").property("value", "");
        clearLinkedHighlight();
        tooltip.style("opacity", 0);
        updateVoiceHeard(null);
        updateStatus("Selection cleared. Use voice or text to select a country.");
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
        .on("mouseover.lab10", showCountryTooltip)
        .on("mousemove.lab10", moveCountryTooltip)
        .on("mouseout.lab10", hideCountryTooltip);

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
        .attr("id", "lab10-gdp-color-gradient")
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
        .attr("fill", "url(#lab10-gdp-color-gradient)");

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

    const cartogramGeoData = {
        type: "FeatureCollection",
        features: matchedCountries
    };

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
            .on("mouseover.lab10", showCountryTooltip)
            .on("mousemove.lab10", moveCountryTooltip)
            .on("mouseout.lab10", hideCountryTooltip);

        const cartogramDefs = cartogramSvg.append("defs");
        const cartogramGradient = cartogramDefs
            .append("linearGradient")
            .attr("id", "lab10-cartogram-gdp-color-gradient")
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
            .attr("fill", "url(#lab10-cartogram-gdp-color-gradient)");

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
            .on("mouseleave.lab10-tooltip", () => {
                clearLinkedHighlight();
                tooltip.style("opacity", 0);
            })
            .call(cartogramZoom);

        if (selectedIso) {
            applySelectedHighlight();
        }
    }

    requestAnimationFrame(() => initializeCartogramView());

    d3.select("#search-button").on("click", () => {
        selectCountryByQuery(d3.select("#country-search").property("value"), "text");
    });

    d3.select("#country-search").on("keydown", event => {
        if (event.key === "Enter") {
            selectCountryByQuery(event.currentTarget.value, "text");
        }
    });

    d3.select("#reset-button").on("click", resetSelection);

    d3.select("#previous-country-button").on("click", () => {
        selectCountryByRankOffset(-1, "button");
    });

    d3.select("#next-country-button").on("click", () => {
        selectCountryByRankOffset(1, "button");
    });

    d3.select(window).on("keydown.lab10-rank", event => {
        if (event.target.tagName === "INPUT") {
            return;
        }

        if (event.key === "ArrowLeft") {
            selectCountryByRankOffset(-1, "keyboard");
        }

        if (event.key === "ArrowRight") {
            selectCountryByRankOffset(1, "keyboard");
        }
    });

    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        d3.select("#voice-button").on("click", () => {
            updateVoiceHeard(null);
            updateStatus("Listening for a country name...");
            recognition.start();
        });

        recognition.onresult = event => {
            const transcript = event.results[0][0].transcript;
            updateVoiceHeard(`Heard: "${transcript}"`);
            updateStatus("Searching...");
            selectCountryByQuery(transcript, "voice");
        };

        recognition.onerror = () => {
            updateStatus("Voice search failed or permission was denied. Use the text box instead.");
        };

        recognition.onend = () => {
            if (!selectedIso) {
                updateStatus("Voice search ended. You can try again or use text search.");
            }
        };
    } else {
        d3.select("#voice-button").attr("disabled", true);
        updateStatus("Voice input is not supported in this browser. Use text search instead.");
    }

    function stopGestureInput() {
        if (gestureTimer) {
            window.clearInterval(gestureTimer);
            gestureTimer = null;
        }

        if (gestureStream) {
            gestureStream.getTracks().forEach(track => track.stop());
            gestureStream = null;
        }

        previousGestureFrame = null;
        gestureStartX = null;
        gestureState = "idle";
        stableFrameCount = 0;
        d3.select("#gesture-video").property("srcObject", null);
        d3.select("#gesture-preview").classed("active", false);
        d3.select("#gesture-button").attr("disabled", null);
        d3.select("#stop-gesture-button").attr("disabled", true);
        gestureStatus.text("Gesture input stopped. Use text, voice, keyboard, or buttons.");
    }

    function analyzeGestureFrame() {
        const video = document.getElementById("gesture-video");
        const canvas = document.getElementById("gesture-canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });

        if (!video.videoWidth || !video.videoHeight) {
            return;
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = frame.data;
        const grayscale = new Uint8ClampedArray(canvas.width * canvas.height);
        let brightness = 0;

        for (let i = 0; i < grayscale.length; i++) {
            const pixelIndex = i * 4;
            const value =
                data[pixelIndex] * 0.299 +
                data[pixelIndex + 1] * 0.587 +
                data[pixelIndex + 2] * 0.114;
            grayscale[i] = value;
            brightness += value;
        }

        brightness /= grayscale.length;

        if (brightness < 28 && Date.now() - lastGestureTime > 1200) {
            lastGestureTime = Date.now();
            resetSelection();
            gestureStatus.text("Camera cover gesture detected: selection reset.");
            previousGestureFrame = grayscale;
            return;
        }

        if (!previousGestureFrame) {
            previousGestureFrame = grayscale;
            return;
        }

        let changedPixels = 0;
        let weightedX = 0;

        for (let i = 0; i < grayscale.length; i++) {
            if (Math.abs(grayscale[i] - previousGestureFrame[i]) > 32) {
                changedPixels += 1;
                weightedX += i % canvas.width;
            }
        }

        previousGestureFrame = grayscale;

        if (changedPixels < 260) {
            stableFrameCount += 1;

            if (stableFrameCount >= 4 && gestureState === "cooldown") {
                gestureState = "idle";
                gestureStartX = null;
                gestureStatus.text("Gesture input active. Ready for the next swipe.");
            }
            return;
        }

        stableFrameCount = 0;
        const motionCenter = weightedX / changedPixels;
        const now = Date.now();

        if (gestureState === "cooldown" || now - lastGestureTime < 900) {
            return;
        }

        if (gestureStartX == null) {
            gestureStartX = motionCenter;
            gestureState = "tracking";
            return;
        }

        const deltaX = motionCenter - gestureStartX;

        if (Math.abs(deltaX) > 34) {
            lastGestureTime = now;
            gestureState = "cooldown";
            gestureStartX = null;

            // The preview is mirrored, so screen-right motion appears as decreasing canvas x.
            if (deltaX < 0) {
                selectCountryByRankOffset(1, "gesture");
                gestureStatus.text("Right swipe detected: moved to the next GDP rank. Pause before another gesture.");
            } else {
                selectCountryByRankOffset(-1, "gesture");
                gestureStatus.text("Left swipe detected: moved to the previous GDP rank. Pause before another gesture.");
            }
        }
    }

    async function startGestureInput() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            gestureStatus.text("Camera input is not supported in this browser.");
            return;
        }

        try {
            gestureStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 320,
                    height: 240,
                    facingMode: "user"
                },
                audio: false
            });

            const video = document.getElementById("gesture-video");
            video.srcObject = gestureStream;
            await video.play();

            d3.select("#gesture-preview").classed("active", true);
            d3.select("#gesture-button").attr("disabled", true);
            d3.select("#stop-gesture-button").attr("disabled", null);
            gestureStartX = null;
            gestureState = "idle";
            stableFrameCount = 0;
            gestureStatus.text("Gesture input active. Swipe left or right, then pause before the next gesture.");
            gestureTimer = window.setInterval(analyzeGestureFrame, 140);
        } catch (error) {
            gestureStatus.text("Camera permission was denied or unavailable. Use another input method.");
        }
    }

    d3.select("#gesture-button").on("click", startGestureInput);
    d3.select("#stop-gesture-button").on("click", stopGestureInput);

}).catch(error => {
    console.error("Lab 10 data loading failed:", error);
});

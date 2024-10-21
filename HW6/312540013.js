// ===========================
// Set chart dimensions & margins
// ===========================
const margins = { top: 20, right: 30, bottom: 0, left: 10 };
const chartWidth = 560 - margins.left - margins.right;
const chartHeight = 500 - margins.top - margins.bottom;

// ===========================
// Create SVG container
// ===========================
const svg = d3.select("#my_dataviz")
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .attr("viewBox", `0 0 ${chartWidth + margins.left + margins.right} ${chartHeight + margins.top + margins.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")  // Preserve aspect ratio
    .append("g")
    .attr("transform", `translate(${margins.left}, ${margins.top})`);

// ===========================
// Path to the CSV data file
// ===========================
const dataFilePath = "http://vis.lab.djosix.com:2024/data/ma_lga_12345.csv"; // http://vis.lab.djosix.com:2024/data/ma_lga_12345.csv

// ===========================
// Load and process the data
// ===========================
d3.csv(dataFilePath).then(function (rawData) {

    let structuredData = {};

    // Organize the data by sale date and property type
    rawData.forEach(entry => {
        if (!(entry.saledate in structuredData)) {
            structuredData[entry.saledate] = {
                "house with 2 bedrooms": 0,
                "house with 3 bedrooms": 0,
                "house with 4 bedrooms": 0,
                "house with 5 bedrooms": 0,
                "unit with 1 bedrooms": 0,
                "unit with 2 bedrooms": 0,
                "unit with 3 bedrooms": 0,
            };
        }
        const houseType = `${entry.type} with ${entry.bedrooms} bedrooms`;
        structuredData[entry.saledate][houseType] = +entry.MA;
    });

    // ===========================
    // Prepare formatted data array for D3
    // ===========================
    let formattedData = [];
    Object.entries(structuredData).forEach(([date, values]) => {
        values.date = moment(date, "DD/MM/YYYY").toDate();
        formattedData.push(values);
    });

    // Sort data by date
    formattedData.sort((a, b) => a.date - b.date);

    // Extract house type keys
    const keys = Object.keys(formattedData[0]).slice(0, -1);

    // Define color scale for different house types
    const colorScale = d3.scaleOrdinal()
        .domain(keys)
        .range(d3.schemeCategory10);

    // Update draggable blocks for house type reordering
    const blockContainer = document.getElementById('blocks');
    blockContainer.innerHTML = keys.map(key => `<div class="list-group-item" style="background-color:${colorScale(key)}">${key}</div>`).join('');

    // Initialize sortable interaction for reordering
    new Sortable(blockContainer, {
        animation: 150,
        onChange: function () {
            const reorderedKeys = Array.from(blockContainer.getElementsByTagName("div")).map(div => div.textContent);
            renderChart(reorderedKeys);
        }
    });

    // Initial chart render
    renderChart(keys);

    // ===========================
    // Function to render chart
    // ===========================
    function renderChart(activeKeys) {

        // Clear previous chart elements
        svg.selectAll('*').remove();

        // Reverse keys for stacking
        const reversedKeys = [...activeKeys].reverse();

        // X-axis: Date
        const xScale = d3.scaleLinear()
            .domain(d3.extent(formattedData, d => d.date))
            .range([0, chartWidth]);

        // Append X-axis
        svg.append("g")
            .attr("transform", `translate(0, ${chartHeight * 0.8})`)
            .call(d3.axisBottom(xScale).ticks(4).tickFormat(d3.utcFormat("%B %d, %Y")).tickSize(-chartHeight * 0.7))
            .selectAll("text").style("font-size", "12px").attr("transform", "translate(0, 10)");

        // Y-axis scale for property prices
        const yScale = d3.scaleLinear()
            .domain([-4000000, 4000000])
            .range([chartHeight, 0]);

        // Stack data based on active keys
        const stackedData = d3.stack()
            .offset(d3.stackOffsetSilhouette)
            .keys(reversedKeys)(formattedData);

        // Tooltip setup for hover effect
        const tooltip = svg.append("foreignObject")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 150)
            .attr("height", 50)
            .style("opacity", 0)
            .append("xhtml:div")
            .style("font-size", "14px")
            .style("background", "#f4f4f4")
            .style("padding", "10px")
            .style("border-radius", "5px")
            .style("box-shadow", "0px 0px 8px rgba(0, 0, 0, 0.2)");

        // Area generator function for the stream graph
        const areaGenerator = d3.area()
            .x(d => xScale(d.data.date))
            .y0(d => yScale(d[0]))
            .y1(d => yScale(d[1]))
            .curve(d3.curveCatmullRom);

        // Draw areas with transitions
        svg.selectAll(".stream-layer")
            .data(stackedData)
            .join("path")
            .attr("class", "stream-layer")
            .style("fill", d => colorScale(d.key))
            .transition().duration(750)
            .attr("d", areaGenerator)
            .on("mouseover", function (event, d) {
                tooltip.style("opacity", 1);
                d3.selectAll(".stream-layer").style("opacity", 0.2);
                d3.select(this).style("opacity", 1);
            })
            .on("mousemove", function (event, d) {
                const [xPos, yPos] = d3.pointer(event);
                const date = xScale.invert(xPos);
                const value = yScale.invert(yPos);
                tooltip.attr("x", xPos + 10).attr("y", yPos - 10).text(`Type: ${d.key}, Date: ${d3.utcFormat("%B %d, %Y")(date)}, Price: ${Math.round(value)}`);
            })
            .on("mouseleave", function () {
                tooltip.style("opacity", 0);
                d3.selectAll(".stream-layer").style("opacity", 1);
            });
    }
});

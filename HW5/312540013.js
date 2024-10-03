// Define the graph's dimensions and margins
const graphMargins = { top: 80, right: 20, bottom: 50, left: 300 };
const graphWidth = 1500 - graphMargins.left - graphMargins.right;
const graphHeight = 20000 - graphMargins.top - graphMargins.bottom;

// Append the SVG object to the chart area
const svgCanvas = d3.select("#chart_area")
    .append("svg")
    .attr("width", "1500px")
    .attr("height", "20000px")
    .attr("preserveAspectRatio", "xMinYMin")
    .append("g")
    .attr("transform", `translate(${graphMargins.left}, ${graphMargins.top})`);

// Path to the CSV data file
const rankingsDataPath = "http://vis.lab.djosix.com:2024/data/TIMES_WorldUniversityRankings_2024.csv";
const scoreCategories = ["scores_teaching", "scores_research", "scores_citations", "scores_industry_income", "scores_international_outlook"];
const colorScheme = d3.scaleOrdinal(["#8e44ad", "#3498db", "#e74c3c", "#2ecc71", "#f1c40f"]);

// Load and parse the CSV data
d3.csv(rankingsDataPath).then(function (universityData) {
    let filteredData = [];
    
    // Filter out universities with rank "Reporter"
    universityData.forEach((uni) => {
        if (uni["rank"] !== "Reporter") {
            filteredData.push({
                "name": uni["name"],
                "scores_overall": +uni["scores_overall"].split("–")[0], // Extract overall score
                "scores_teaching": +uni["scores_teaching"],
                "scores_research": +uni["scores_research"],
                "scores_citations": +uni["scores_citations"],
                "scores_industry_income": +uni["scores_industry_income"],
                "scores_international_outlook": +uni["scores_international_outlook"]
            });
        }
    });

    // Sort the data based on the selected sorting criterion and order
    function sortData(data, sortBy, sortOrder) {
        return data.sort((a, b) => sortOrder === "descending" ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy]);
    }

    // Function to render the stacked bar chart
    function renderStackedBarChart(data) {
        svgCanvas.selectAll('*').remove(); // Clear previous chart

        // Stack the data
        const stackedData = d3.stack().keys(scoreCategories)(data);

        // Define X scale
        const xScale = d3.scaleLinear()
            .domain([0, 500])
            .range([0, graphWidth]);

        // Define Y scale
        const yScale = d3.scaleBand()
            .domain(data.map(d => d.name))
            .range([0, graphHeight])
            .padding(.2);

        // Create vertical grid lines
        svgCanvas.append("g")
            .attr("class", "grid")
            .call(d3.axisBottom(xScale).tickSize(graphHeight).tickFormat(""));

        // Tooltip for the bars
        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip");

        // Tooltip event handlers
        const mouseOverEvent = function () {
            tooltip.style("opacity", 0.8);
            d3.select(this).style("opacity", 0.5);
        };
        const mouseMoveEvent = function (event, d) {
            tooltip.html((d[1] - d[0]).toFixed(1))
                .style("top", event.pageY - 10 + "px")
                .style("left", event.pageX + 10 + "px");
        };
        const mouseLeaveEvent = function () {
            tooltip.style("opacity", 0);
            d3.select(this).style("opacity", 1);
        };

        // Draw the bars
        svgCanvas.append("g")
            .selectAll("g")
            .data(stackedData)
            .join("g")
            .attr("fill", d => colorScheme(d.key))
            .selectAll("rect")
            .data(d => d)
            .join("rect")
            .attr("x", d => xScale(d[0]))
            .attr("y", d => yScale(d.data.name))
            .attr("width", d => xScale(d[1]) - xScale(d[0]))
            .attr("height", yScale.bandwidth())
            .on("mouseover", mouseOverEvent)
            .on("mousemove", mouseMoveEvent)
            .on("mouseleave", mouseLeaveEvent);

        // Add Y axis
        svgCanvas.append("g")
            .call(d3.axisLeft(yScale).tickSize(0).tickPadding(8))
            .selectAll("text")
            .style("font-size", "10px")
            .style("font-weight", "bold");

        // Add Y axis label
        svgCanvas.append("text")
            .attr("class", "chart-label")
            .attr("x", graphWidth / 2)
            .attr("y", graphHeight + graphMargins.bottom / 2)
            .attr("text-anchor", "middle")
            .text("Score (0~100)");

        // Add chart title
        svgCanvas.append("text")
            .attr("class", "chart-title")
            .attr("x", -(graphMargins.left) * 0.8)
            .attr("y", -(graphMargins.top) / 1.5)
            .attr("text-anchor", "start")
            .text("Times World University Rankings 2024");

        // Add legend
        const legendInfo = [
            { color: "#8e44ad", label: "Teaching" },
            { color: "#3498db", label: "Research" },
            { color: "#e74c3c", label: "Citations" },
            { color: "#2ecc71", label: "Industry income" },
            { color: "#f1c40f", label: "International outlook" }
        ];
        legendInfo.forEach((item, index) => {
            svgCanvas.append("rect")
                .attr("x", -(graphMargins.left) * 0.8 + (index * 150))
                .attr("y", -(graphMargins.top / 2))
                .attr("width", 10)
                .attr("height", 10)
                .style("fill", item.color);
                
            svgCanvas.append("text")
                .attr("class", "legend")
                .attr("x", -(graphMargins.left) * 0.8 + 20 + (index * 150))
                .attr("y", -(graphMargins.top / 2.5))
                .style("font-size", "14px")  // Adjust this to make the text smaller
                .text(item.label);
        });
    }

    // Event handler for the sort button click
    function handleSortButtonClick() {
        const sortBy = document.querySelector("#sort-by").value;
        const sortOrder = document.querySelector("#sort-order").value;

        const sortedData = sortData(filteredData, sortBy, sortOrder);
        renderStackedBarChart(sortedData);
    }

    // Attach event listener to sort button
    document.querySelector("#sort-button").addEventListener("click", handleSortButtonClick);

    // Initial rendering of the chart
    handleSortButtonClick();
});

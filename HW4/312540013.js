const csvFilePath = "./iris.csv";  // Renamed to clarify that this is the CSV file path

// Set dimensions for each cell in the scatter plot matrix
var plotSize = 200;  // Renamed for clarity
var plotPadding = 30;  // Renamed for clarity

// X and Y axis scales
var xScale = d3.scaleLinear()  // Renamed for better clarity
    .range([plotPadding / 2, plotSize - plotPadding / 2]);

var yScale = d3.scaleLinear()  // Renamed for better clarity
    .range([plotSize - plotPadding / 2, plotPadding / 2]);

// Axis definitions
var xAxis = d3.axisBottom()
    .scale(xScale)
    .ticks(6).tickFormat("");

var yAxis = d3.axisLeft()
    .scale(yScale)
    .ticks(6).tickFormat("");

// Color scale for different species classes
const speciesColor = d3.scaleOrdinal()
    .domain(["setosa", "versicolor", "virginica"])
    .range(["#FF8C00", "#8A2BE2", "#006400"]);

// Feature names for the scatter plot
const featuresList = ["sepal length", "sepal width", "petal length", "petal width"];  // Renamed for clarity

// Load the CSV file and start processing
d3.csv(csvFilePath, function (error, data) {
    if (error) throw error;  // Error handling
    
    // Remove extra rows (if any)
    data.splice(150, 1);  // Removing unwanted rows from the dataset
    
    // Create a domain for each trait based on the data
    var domainByFeature = {};  // Renamed to better reflect its purpose
    var traits = d3.keys(data[0]).filter(function (d) { return d !== "class"; });
    var numberOfTraits = traits.length;  // Number of traits for scatter plot

    traits.forEach(function (trait) {
        domainByFeature[trait] = d3.extent(data, function (d) { return d[trait]; });
    });

    xAxis.tickSize(plotSize * numberOfTraits);
    yAxis.tickSize(-plotSize * numberOfTraits);

    // Brush event handlers to enable brushing functionality
    var brush = d3.brush()
        .on("start", onBrushStart)
        .on("brush", onBrushMove)
        .on("end", onBrushEnd)
        .extent([[15, 15], [plotSize - 15, plotSize - 15]]);

    // Create the SVG container for the scatter plot matrix
    var svg = d3.select("#scatterplot_matrix").append("svg")  // Updated the div ID to match HTML
        .attr("width", plotSize * numberOfTraits + plotPadding)
        .attr("height", plotSize * numberOfTraits + plotPadding)
        .append("g")
        .attr("transform", "translate(" + plotPadding + "," + plotPadding / 2 + ")");

    // Create individual cells in the scatter plot matrix
    var cell = svg.selectAll(".cell")
        .data(cross(traits, traits))
        .enter().append("g")
        .attr("class", "cell")
        .attr("transform", function (d) { return "translate(" + (numberOfTraits - d.i - 1) * plotSize + "," + d.j * plotSize + ")"; })
        .each(drawPlot);

    // Add brushing functionality to each cell
    cell.call(brush);

    // Function to draw individual plots in the scatter plot matrix
    function drawPlot(p) {
        var cell = d3.select(this);

        xScale.domain(domainByFeature[p.x]);
        yScale.domain(domainByFeature[p.y]);

        var positionScale = d3.scalePoint()
            .domain(featuresList)
            .range([0, 1]);

        if (p.x != p.y) {
            // Create scatter plot for different traits
            var plotGroup = cell
                .append('g')
                .attr("transform", `translate(${positionScale(p.x) + plotPadding / 2},${positionScale(p.y) + plotPadding / 2})`);

            plotGroup.append("rect")
                .attr("class", "plot-frame")  // Renamed for better clarity
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", plotSize - plotPadding)
                .attr("height", plotSize - plotPadding);

            var xExtent = d3.extent(data, function (d) { return +d[p.x]; });
            var xScaleLocal = d3.scaleLinear()
                .domain(xExtent)
                .range([plotPadding / 2, plotSize - plotPadding / 2]);

            var yExtent = d3.extent(data, function (d) { return +d[p.y]; });
            var yScaleLocal = d3.scaleLinear()
                .domain(yExtent)
                .range([plotSize - plotPadding / 2, plotPadding / 2]);

            plotGroup.append("g")
                .attr("transform", `translate(${-plotPadding / 2}, ${plotSize - plotPadding})`)
                .call(d3.axisBottom().scale(xScaleLocal).ticks(6));
            plotGroup.append("g")
                .attr("transform", `translate(0, ${-plotPadding / 2})`)
                .call(d3.axisLeft().scale(yScaleLocal).ticks(6));

            // Add circles representing data points
            cell.selectAll("circle")
                .data(data)
                .enter().append("circle")
                .attr("cx", function (d) { return xScale(d[p.x]); })
                .attr("cy", function (d) { return yScale(d[p.y]); })
                .attr("r", 4)
                .style("fill", function (d) { return speciesColor(d.class); });
        } else {
            // Create histogram for diagonal plots (same trait comparison)
            var plotGroup = cell
                .append('g')
                .attr("transform", `translate(${positionScale(p.x) + plotPadding / 2},${positionScale(p.y) + plotPadding / 2})`);

            var xExtent = d3.extent(data, function (d) { return +d[p.x]; });
            var xScaleLocal = d3.scaleLinear()
                .domain(xExtent).nice()
                .range([0, plotSize - plotPadding]);

            // Add gradient and shadow filters
            plotGroup.append("defs")
                .append("linearGradient")
                .attr("id", "gradient")
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "100%")
                .attr("y2", "100%")
                .html('<stop offset="0%" style="stop-color:rgba(30,144,255,1);stop-opacity:1" /><stop offset="100%" style="stop-color:rgba(0,191,255,1);stop-opacity:1" />');

            plotGroup.append("defs")
                .append("filter")
                .attr("id", "drop-shadow")
                .append("feDropShadow")
                .attr("dx", 1)
                .attr("dy", 1)
                .attr("stdDeviation", 2);

            var histogram = d3.histogram()
                .value(function (d) { return +d[p.x]; })
                .domain(xScaleLocal.domain())
                .thresholds(xScaleLocal.ticks(15));

            var bins = histogram(data);

            var yScaleLocal = d3.scaleLinear()
                .range([plotSize - plotPadding, 0])
                .domain([0, d3.max(bins, function (d) { return d.length; })]);

            plotGroup.append('g').attr("transform", `translate(${0}, ${0})`)
                .selectAll("rect")
                .data(bins)
                .enter()
                .append("rect")
                .attr("x", 1)
                .attr("transform", function (d) { return "translate(" + xScaleLocal(d.x0) + "," + yScaleLocal(d.length) + ")"; })
                .attr("width", function (d) { return xScaleLocal(d.x1) - xScaleLocal(d.x0); })
                .attr("height", function (d) { return (plotSize - plotPadding) - yScaleLocal(d.length); })
                .style("fill", "url(#gradient)")  // Apply gradient fill
                .style("filter", "url(#drop-shadow)");  // Apply shadow

            plotGroup.append("text")
                .text(p.x)
                .attr("text-anchor", "middle")
                .attr("x", plotSize / 2 - plotPadding / 2)
                .attr("y", plotPadding / 2)
                .style("fill", "#2F4F4F")
                .style("font-size", 14)
                .style("font-weight", "bold");

            plotGroup.append("rect")
                .attr("class", "plot-frame")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", plotSize - plotPadding)
                .attr("height", plotSize - plotPadding);

            plotGroup.append("g")
                .attr("transform", `translate                (${0}, ${plotSize - plotPadding})`)
                .call(d3.axisBottom().scale(xScaleLocal).ticks(6));
            
            plotGroup.append("g")
                .attr("transform", `translate(0, ${0})`)
                .call(d3.axisLeft().scale(yScaleLocal).ticks(6));
        }
    }

    // Add legend for species classification
    svg.append("circle")
        .attr("cx", (plotSize * numberOfTraits) / 2 - 130)
        .attr("cy", -3)
        .attr("r", 4)
        .style("fill", "#FF8C00");  // Color for Setosa
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", (plotSize * numberOfTraits) / 2 - 100)
        .attr("y", 0)
        .text("setosa")
        .style("fill", "#FF8C00");
    
    svg.append("circle")
        .attr("cx", (plotSize * numberOfTraits) / 2 - 40)
        .attr("cy", -3)
        .attr("r", 4)
        .style("fill", "#8A2BE2");  // Color for Versicolor
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", (plotSize * numberOfTraits) / 2)
        .attr("y", 0)
        .text("versicolor")
        .style("fill", "#8A2BE2");
    
    svg.append("circle")
        .attr("cx", (plotSize * numberOfTraits) / 2 + 65)
        .attr("cy", -3)
        .attr("r", 4)
        .style("fill", "#006400");  // Color for Virginica
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", (plotSize * numberOfTraits) / 2 + 100)
        .attr("y", 0)
        .text("virginica")
        .style("fill", "#006400");

    var activeBrushCell;  // Track active cell with the brush

    // Handle brush start event
    function onBrushStart(p) {
        if (activeBrushCell !== this) {
            d3.select(activeBrushCell).call(brush.move, null);  // Clear the previous brush
            activeBrushCell = this;
            xScale.domain(domainByFeature[p.x]);
            yScale.domain(domainByFeature[p.y]);
        }
    }

    // Handle brush move event
    function onBrushMove(p) {
        var brushSelection = d3.brushSelection(this);
        svg.selectAll("circle").classed("hidden", function (d) {
            if (!brushSelection) {
                return false;
            } else {
                if (p.x == p.y) {
                    return false;
                } else {
                    return (
                        brushSelection[0][0] > xScale(+d[p.x]) || xScale(+d[p.x]) > brushSelection[1][0]
                        || brushSelection[0][1] > yScale(+d[p.y]) || yScale(+d[p.y]) > brushSelection[1][1]
                    );
                }
            }
        });
    }

    // Handle brush end event
    function onBrushEnd() {
        var brushSelection = d3.brushSelection(this);
        if (brushSelection === null) svg.selectAll(".hidden").classed("hidden", false);
    }
});

// Function to cross traits and create pairs for scatter plot matrix
function cross(traitA, traitB) {
    var pairs = [], lenA = traitA.length, lenB = traitB.length, i, j;
    for (i = -1; ++i < lenA;) {
        for (j = -1; ++j < lenB;) {
            pairs.push({ x: traitA[i], i: i, y: traitB[j], j: j });
        }
    }
    return pairs;
}
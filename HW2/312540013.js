// Set the dimensions and margins of the graph
var margin = { top: 30, right: 100, bottom: 10, left: 60 },
    width = 950 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

// Append the SVG object to the "#dataviz" container
var svg = d3.select("#dataviz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Load the data from CSV
const dataPath = "http://vis.lab.djosix.com:2024/data/iris.csv";
d3.csv(dataPath, function (data) {
    data.splice(150, 1); // Remove extra data point if present

    // Define color scale for species
    var colorScale = d3.scaleOrdinal()
        .domain(["Iris-setosa", "Iris-versicolor", "Iris-virginica"])
        .range(["#00ffff", "#ff00ff", "#ffaa00"]); // Bright colors

    // Define dimensions for the axes
    var dimensions = ["sepal length", "sepal width", "petal length", "petal width"];

    // Create a linear scale for each dimension
    var yScale = {};
    for (var i in dimensions) {
        var dimension = dimensions[i];
        // Find the max and min of each dimension
        let dimMax = 0;
        let dimMin = 100;
        for (let j = 0; j < data.length; j++) {
            if (data[j][dimension] > dimMax) {
                dimMax = data[j][dimension];
            }
            if (data[j][dimension] < dimMin) {
                dimMin = data[j][dimension];
            }
        }
        // Create y scale for this dimension
        yScale[dimension] = d3.scaleLinear()
            .domain([Math.floor(dimMin), Math.ceil(dimMax)]) // Same axis range for each group
            .range([height, 0]);
    }

    // Create the x scale
    var xScale = d3.scalePoint()
        .range([0, width])
        .domain(dimensions);
    var x = {};
    for (var i in dimensions) {
        var dimension = dimensions[i];
        x[dimension] = xScale(dimension);
    }

    // Highlight the species that is hovered
    var highlight = function (d) {
        var selectedSpecies = d.class;

        // First, every group turns grey
        d3.selectAll(".line")
            .transition().duration(200)
            .style("stroke", "lightgrey")
            .style("opacity", "0.2");
        // Second, the hovered species takes its color
        d3.selectAll("." + selectedSpecies)
            .transition().duration(200)
            .style("stroke", colorScale(selectedSpecies))
            .style("opacity", "0.5");
    };

    // Unhighlight function
    var doNotHighlight = function () {
        d3.selectAll(".line")
            .transition().duration(200).delay(1000)
            .style("stroke", function (d) { return colorScale(d.class); })
            .style("opacity", "0.5");
    };

    // The path function takes a row of the CSV as input and returns x and y coordinates of the line to draw for this row
    function path(d) {
        return d3.line()(dimensions.map(function (p) { return [x[p], yScale[p](d[p])]; }));
    }

    // Arrays to hold draggable axes and their indices
    var draggableAxes = [];
    var axisIndices = [];

    // Draw the lines
    var linePaths = svg.selectAll("myPath")
        .data(data)
        .enter()
        .append("path")
        .attr("class", function (d) { return "line " + d.class; }) // Two classes for each line: 'line' and the group name
        .attr("d", path)
        .style("fill", "none")
        .style("opacity", 0.5)
        .style("stroke", function (d) { return colorScale(d.class); })
        .attr("stroke-width", 1.5)
        .on("mouseover", highlight)
        .on("mouseleave", doNotHighlight);

    // Draw the axes
    var axisGroups = svg.selectAll("myAxis")
        // For each dimension of the dataset, add a 'g' element
        .data(dimensions).enter()
        .append("g")
        .attr("class", "axis")
        // Translate this element to its correct position on the x axis
        .attr("transform", function (d) { return "translate(" + x[d] + ")"; })
        // Build the axis with the call function
        .each(function (d, index) {
            draggableAxes[index] = d3.select(this).call(d3.axisLeft().ticks(5).scale(yScale[d]));
            axisIndices[index] = index;
            draggableAxes[index].call(d3.drag()
                .on("start", function () { })
                .on("drag", function (d) {
                    // Update x position of the dragged axis
                    x[d] = Math.min(Math.max(d3.event.x, 0), 800);
                    draggableAxes[index].attr("transform", function () { return "translate(" + x[d] + ")"; });
                    // Swap axes if necessary
                    for (var i = 0; i < 4; i++) {
                        for (var j = i + 1; j < 4; j++) {
                            if (x[dimensions[i]] >= x[dimensions[j]]) {
                                if (d == dimensions[i]) {
                                    x[dimensions[j]] = (800 / 3) * i;
                                    draggableAxes[axisIndices[j]].attr("transform", function () { return "translate(" + x[dimensions[j]] + ")"; });
                                }
                                if (d == dimensions[j]) {
                                    x[dimensions[i]] = (800 / 3) * j;
                                    draggableAxes[axisIndices[i]].attr("transform", function () { return "translate(" + x[dimensions[i]] + ")"; });
                                }
                                // Swap dimensions
                                var tempDim = dimensions[i];
                                dimensions[i] = dimensions[j];
                                dimensions[j] = tempDim;
                                // Swap axis indices
                                var tempIndex = axisIndices[i];
                                axisIndices[i] = axisIndices[j];
                                axisIndices[j] = tempIndex;
                                break;
                            }
                        }
                    }
                    // Update the lines
                    linePaths.attr("d", path);
                })
                .on("end", function () { }));
        });

    // Add axis titles with zoom effect
    axisGroups.append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(function (d) { return d; })
        .style("fill", "black")
        .style("font-size", "12px")  // Initial font size
        .on("mouseover", function () {
            d3.select(this)
                .transition()
                .duration(200)
                .style("font-size", "20px")  // Increase font size on hover
                .style("fill", "red");   // Change color on hover
        })
        .on("mouseout", function () {
            d3.select(this)
                .transition()
                .duration(200)
                .style("font-size", "12px")  // Revert back to original size
                .style("fill", "black");     // Revert color
        });

    // Add legend with color boxes and black text
    var legendData = [
        { name: "setosa", color: "#00ffff" },
        { name: "versicolor", color: "#ff00ff" },
        { name: "virginica", color: "#ffaa00" }
    ];

    // Append a legend for each class
    legendData.forEach(function (d, i) {
        svg.append("rect")
            .attr("x", width + 10)
            .attr("y", height - 60 + i * 20) // Adjust spacing between boxes
            .attr("width", 15)
            .attr("height", 15)
            .style("fill", d.color);

        svg.append("text")
            .attr("x", width + 30)
            .attr("y", height - 47 + i * 20) // Align with the boxes
            .text(d.name)
            .style("fill", "black")  // Class names in black
            .attr("alignment-baseline", "middle");
    });
});

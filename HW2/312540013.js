// Set up margins and dimensions for the plot
var plotMargins = { top: 30, right: 100, bottom: 10, left: 60 },
    plotWidth = 950 - plotMargins.left - plotMargins.right,
    plotHeight = 400 - plotMargins.top - plotMargins.bottom;

// Append SVG container for the visualization
var svgContainer = d3.select("#dataviz")
    .append("svg")
    .attr("width", plotWidth + plotMargins.left + plotMargins.right)
    .attr("height", plotHeight + plotMargins.top + plotMargins.bottom)
    .append("g")
    .attr("transform", "translate(" + plotMargins.left + "," + plotMargins.top + ")");

// Load data from CSV
const dataUrl = "http://vis.lab.djosix.com:2024/data/iris.csv";
d3.csv(dataUrl, function (data) {
    data.splice(150, 1);  // Remove erroneous data point

    // Define color scale for species
    var colorScale = d3.scaleOrdinal()
        .domain(["Iris-setosa", "Iris-versicolor", "Iris-virginica"])
        .range(["#00ffff", "#ff00ff", "#ffaa00"]); // Bright colors for each species

    // Define the dimensions (attributes) to visualize
    var attributes = ["sepal length", "sepal width", "petal length", "petal width"];

    // Create a Y-axis scale for each attribute
    var yScales = {};
    attributes.forEach(attr => {
        let minVal = d3.min(data, d => +d[attr]);
        let maxVal = d3.max(data, d => +d[attr]);
        yScales[attr] = d3.scaleLinear()
            .domain([Math.floor(minVal), Math.ceil(maxVal)])  // Adjust axis range
            .range([plotHeight, 0]);
    });

    // Create the X-axis scale for positioning each attribute
    var xScale = d3.scalePoint()
        .range([0, plotWidth])
        .domain(attributes);

    // Function to highlight the hovered species
    function highlightSpecies(d) {
        let selectedSpecies = d.class;
        d3.selectAll(".line")
            .transition().duration(200)
            .style("stroke", "lightgrey")
            .style("opacity", 0.2);

        d3.selectAll("." + selectedSpecies)
            .transition().duration(200)
            .style("stroke", colorScale(selectedSpecies))
            .style("opacity", 0.5);
    }

    // Function to reset the highlight
    function resetHighlight() {
        d3.selectAll(".line")
            .transition().duration(200).delay(1000)
            .style("stroke", d => colorScale(d.class))
            .style("opacity", 0.5);
    }

    // Function to generate the path for each data row
    function generatePath(d) {
        return d3.line()(attributes.map(attr => [xScale(attr), yScales[attr](d[attr])]));
    }

    // Append the data lines to the chart
    var dataLines = svgContainer.selectAll(".dataLine")
        .data(data)
        .enter()
        .append("path")
        .attr("class", d => "line " + d.class)
        .attr("d", generatePath)
        .style("fill", "none")
        .style("opacity", 0.5)
        .style("stroke", d => colorScale(d.class))
        .attr("stroke-width", 1.5)
        .on("mouseover", highlightSpecies)
        .on("mouseleave", resetHighlight);

    // Create the axes for each attribute
    var dragHandles = [], attrIndexMap = [];
    var axisGroup = svgContainer.selectAll(".axisGroup")
        .data(attributes)
        .enter()
        .append("g")
        .attr("class", "axis")
        .attr("transform", d => "translate(" + xScale(d) + ")")
        .each(function (d, i) {
            let axis = d3.axisLeft().ticks(5).scale(yScales[d]);
            dragHandles[i] = d3.select(this).call(axis);
            attrIndexMap[i] = i;

            // Enable dragging for axes
            dragHandles[i].call(d3.drag()
                .on("drag", function (d) {
                    let currentX = Math.min(Math.max(d3.event.x, 0), 800);
                    xScale[d] = currentX;
                    dragHandles[i].attr("transform", "translate(" + currentX + ")");

                    // Rearrange attributes based on drag position
                    for (var j = 0; j < attributes.length; j++) {
                        for (var k = j + 1; k < attributes.length; k++) {
                            if (xScale[attributes[j]] >= xScale[attributes[k]]) {
                                let tempAttr = attributes[j], tempIndex = attrIndexMap[j];
                                attributes[j] = attributes[k];
                                attrIndexMap[j] = attrIndexMap[k];
                                attributes[k] = tempAttr;
                                attrIndexMap[k] = tempIndex;
                                break;
                            }
                        }
                    }

                    dataLines.attr("d", generatePath);
                }));
        });

    // Add axis labels with hover zoom effect
    axisGroup.append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(d => d)
        .style("fill", "black")
        .style("font-size", "12px")
        .on("mouseover", function () {
            d3.select(this)
                .transition().duration(200)
                .style("font-size", "20px")
                .style("fill", "red");
        })
        .on("mouseout", function () {
            d3.select(this)
                .transition().duration(200)
                .style("font-size", "12px")
                .style("fill", "black");
        });

    // Create a legend for the species
    var legendData = [
        { name: "setosa", color: "#00ffff" },
        { name: "versicolor", color: "#ff00ff" },
        { name: "virginica", color: "#ffaa00" }
    ];

    // Add legend items (color boxes and labels)
    legendData.forEach((d, i) => {
        svgContainer.append("rect")
            .attr("x", plotWidth + 10)
            .attr("y", plotHeight - 60 + i * 20)
            .attr("width", 15)
            .attr("height", 15)
            .style("fill", d.color);

        svgContainer.append("text")
            .attr("x", plotWidth + 30)
            .attr("y", plotHeight - 47 + i * 20)
            .text(d.name)
            .style("fill", "black")
            .attr("alignment-baseline", "middle");
    });
});


// Set the dimensions and margins of the graph
var margin = { top: 30, right: 100, bottom: 10, left: 60 },
    width = 950 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

// Append the SVG object to the #dataviz container
var svg = d3.select("#dataviz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")")

// Load the data from CSV
const data_path = "./iris.csv"
d3.csv(data_path, function (data) {
    data.splice(150, 1);
    // Define color scale for species
    var color = d3.scaleOrdinal()
        .domain(["Iris-setosa", "Iris-versicolor", "Iris-virginica"])
        .range(["#00ffff", "#ff00ff", "#ffaa00"]); // New bright colors: pink, cyan, lime green


    // Define dimensions for the axes
    dimensions = ["sepal length", "sepal width", "petal length", "petal width"]

    // Create a linear scale for each dimension
    var y = {}
    for (d in dimensions) {
        // console.log(dimensions[d])
        // Find the max and min of each dimension
        let d_max = 0
        let d_min = 100
        for(let i = 0; i < data.length; i++) {
            if(data[i][dimensions[d]] > d_max) {
                d_max = data[i][dimensions[d]]
            }
            if(data[i][dimensions[d]] < d_min) {
                d_min = data[i][dimensions[d]]
            }
        }
        // console.log(Math.floor(d_min), Math.ceil(d_max))
        name = dimensions[d]
        y[name] = d3.scaleLinear()
            .domain([Math.floor(d_min), Math.ceil(d_max)]) // --> Same axis range for each group
            // --> different axis range for each group --> .domain( [d3.extent(data, function(d) { return +d[name]; })] )
            .range([height, 0])
    }

    // Create the X scale
    var x = {}
    tmpx = d3.scalePoint()
        .range([0, width])
        .domain(dimensions);
    for (i in dimensions) {
        name = dimensions[i];
        x[name] = tmpx(name);
    }
    // Highlight the specie that is hovered
    var highlight = function (d) {

        selected_specie = d.class

        // first every group turns grey
        d3.selectAll(".line")
            .transition().duration(200)
            .style("stroke", "lightgrey")
            .style("opacity", "0.2")
        // Second the hovered specie takes its color
        d3.selectAll("." + selected_specie)
            .transition().duration(200)
            .style("stroke", color(selected_specie))
            .style("opacity", "0.5")
    }

    // Unhighlight
    var doNotHighlight = function (d) {
        d3.selectAll(".line")
            .transition().duration(200).delay(1000)
            .style("stroke", function (d) { return (color(d.class)) })
            .style("opacity", "0.5")
    }

    // The path function take a row of the csv as input, and return x and y coordinates of the line to draw for this raw.
    function path(d) {
        return d3.line()(dimensions.map(function (p) { return [x[p], y[p](d[p])]; }));
    }
    var dragg = [];
    var ID = [];
    // Draw the lines

    var tmp1 = svg.selectAll("myPath")
        .data(data)
        .enter()
        .append("path")
        .attr("class", function (d) { return "line " + d.class }) // 2 class for each line: 'line' and the group name
        .attr("d", path)
        .style("fill", "none")
        .style("opacity", 0.5)
        .style("stroke", function (d) { return (color(d.class)) })
        .attr("stroke-width", 1.5)
        .on("mouseover", highlight)
        .on("mouseleave", doNotHighlight);

    //console.log(tmp1._groups[0][0])
    // Draw the axis:
    var tmp = svg.selectAll("myAxis")
        // For each dimension of the dataset I add a 'g' element:
        .data(dimensions).enter()
        .append("g")
        .attr("class", "axis")
        // I translate this element to its right position on the x axis
        .attr("transform", function (d) { return "translate(" + x[d] + ")"; })

        // And I build the axis with the call function
        .each(function (d, index) {
            dragg[index] = d3.select(this).call(d3.axisLeft().ticks(5).scale(y[d]));
            ID[index] = index;
            dragg[index].call(d3.drag()
                .on("start", function (d) { })
                .on("drag", function (d) {
                    //console.log(1)
                    x[d] = Math.min(Math.max(d3.event.x, 0), 800);
                    dragg[index].attr("transform", function (d) { return "translate(" + x[d] + ")"; })
                    for (var i = 0; i < 4; i++) {
                        for (var j = i + 1; j < 4; j++) {
                            if (x[dimensions[i]] >= x[dimensions[j]]) {
                                if (d == dimensions[i]) {
                                    x[dimensions[j]] = 800 / 3 * i;
                                    dragg[ID[j]].attr("transform", function (d) { return "translate(" + x[dimensions[j]] + ")"; })
                                }
                                if (d == dimensions[j]) {
                                    x[dimensions[i]] = 800 / 3 * j;
                                    dragg[ID[i]].attr("transform", function (d) { return "translate(" + x[dimensions[i]] + ")"; })
                                }
                                swaptmp = dimensions[i];
                                dimensions[i] = dimensions[j];
                                dimensions[j] = swaptmp;
                                swaptmp = ID[i];
                                ID[i] = ID[j];
                                ID[j] = swaptmp;
                                break;
                            }
                        }
                    }
                    tmp1.attr("d", path)
                })
                .on("end", function (d) { }))
        });

    // Add axis title with zoom effect
    tmp.append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(function(d) { return d; })
        .style("fill", "black")
        .style("font-size", "12px")  // Initial font size
        .on("mouseover", function() {
            d3.select(this)
            .transition()
            .duration(200)
            .style("font-size", "20px")  // Increase font size on hover
            .style("fill", "red");   // Change color on hover (optional)
        })
        .on("mouseout", function() {
            d3.select(this)
            .transition()
            .duration(200)
            .style("font-size", "12px")  // Revert back to original size
            .style("fill", "black");     // Revert color (optional)
        });


    // Add legend with color boxes and black text:
    var legendData = [
        {name: "setosa", color: "#00ffff"},
        {name: "versicolor", color: "#ff00ff"},
        {name: "virginica", color: "#ffaa00"}
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
})
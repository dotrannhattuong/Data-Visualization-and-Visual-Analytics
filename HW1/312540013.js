// Load and prepare data
d3.csv("http://vis.lab.djosix.com:2024/data/iris.csv", function (data) {
    // Adjust data by removing the last entry
    data = data.slice(0, -1);

    // Initialize dimensions and margins for the scatter plot
    var margin = { top: 20, right: 20, bottom: 90, left: 50 },
        width = 620 - margin.left - margin.right,
        height = 660 - margin.top - margin.bottom;

    let x_label = "sepal length";
    let y_label = "sepal width";

    function scatter() {
        // Remove any existing SVG to avoid overlaps
        d3.select("#dataviz").select('svg').remove();

        // Create an SVG element within the designated div
        var svg = d3.select("#dataviz")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Background color adjustment for the scatter plot area
        svg.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", height)
            .attr("width", height)
            .style("fill", "white");

        // Determine max and min for axes
        let x_max = 0;
        let y_max = 0;
        let x_min = 100;
        let y_min = 100;
        data.forEach(function(d) {
            if(d[x_label] > x_max) x_max = d[x_label];
            if(d[y_label] > y_max) y_max = d[y_label];
            if(d[x_label] < x_min) x_min = d[x_label];
            if(d[y_label] < y_min) y_min = d[y_label];
        });

        // Construct X axis with grid lines
        var x = d3.scaleLinear()
            .domain([Math.floor(x_min), Math.ceil(x_max)])
            .range([0, width]);

        var xAxis = svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x).ticks(10))
            .call(g => g.selectAll(".tick line")
                .clone()
                .attr("y2", -height)
                .attr("stroke", "#000")  // Darker color for grid lines
                .attr("stroke-opacity", 1)  // Higher opacity for even bolder lines
                .attr("stroke-width", 2));  // Increase stroke width for bolder lines

        // X axis customization
        xAxis.select(".domain").attr("stroke", "#000").attr("stroke-width", "2");
        xAxis.selectAll(".tick line").attr("stroke", "#bbb").attr("stroke-opacity", "0.3");

        // Construct Y axis with grid lines
        var y = d3.scaleLinear()
            .domain([Math.floor(y_min), Math.ceil(y_max)])
            .range([height, 0])
            .nice();

        var yAxis = svg.append("g")
            .call(d3.axisLeft(y).ticks(7))
            .call(g => g.selectAll(".tick line")
                .clone()
                .attr("x2", width)
                .attr("stroke", "#000")  // Darker color for grid lines
                .attr("stroke-opacity", 1)  // Higher opacity for even bolder lines
                .attr("stroke-width", 2));  // Increase stroke width for bolder lines

        // Y axis customization
        yAxis.select(".domain").attr("stroke", "#000").attr("stroke-width", "2");
        yAxis.selectAll(".tick line").attr("stroke", "#bbb").attr("stroke-opacity", "0.3");

        // Function to capitalize the first letter of a string
        function capitalizeFirstLetter(string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        }

        // Adding labels to axes
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.top + 20)
            .text(capitalizeFirstLetter(x_label));

        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -height / 2)
            .text(capitalizeFirstLetter(y_label));

        // Define color scale based on species
        var color = d3.scaleOrdinal()
            .domain(["Iris-setosa", "Iris-versicolor", "Iris-virginica"])
            .range(["#ff000080", "#00ff0080", "#0000ff80"]);

        // Add data points as colored circles
        svg.append('g')
            .selectAll("dot")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", function (d) { return x(d[x_label]); })
            .attr("cy", function (d) { return y(d[y_label]); })
            .attr("r", 5)
            .style("fill", function (d) { return color(d["class"]) });

        // Define legend properties and position
        var legend = svg.append("g")
            .attr("transform", "translate(" + (width - 90) + ",-1)");  // Position above the graph

        // Add a white background with border for clarity
        legend.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 90)
            .attr("height", 60)
            .attr("fill", "white")
            .attr("stroke", "black");

        // Define legend entries
        var legends = [
            { color: "#ff000080", text: "Setosa", yOffset: 10 },
            { color: "#00ff0080", text: "Versicolor", yOffset: 30 },
            { color: "#0000ff80", text: "Virginica", yOffset: 50 }
        ];

        legends.forEach(function(legendEntry) {
            legend.append("circle")
                .attr("cx", 10)
                .attr("cy", legendEntry.yOffset)
                .attr("r", 5)
                .style("fill", legendEntry.color);

            legend.append("text")
                .attr("x", 25)
                .attr("y", legendEntry.yOffset)
                .text(legendEntry.text)
                .style("fill", "black")
                .attr("font-size", "12px")
                .attr("alignment-baseline", "middle");
        });
    }

    // Listen for axis selection changes
    const radioButtons = document.querySelectorAll('input[name="X_axis"], input[name="Y_axis"]');
    for(const radioButton of radioButtons){
        radioButton.addEventListener('change', function(e) {
            if (this.checked) {
                if(this.name == "X_axis") {
                    x_label = this.value;
                } else if(this.name == "Y_axis") {
                    y_label = this.value;
                }
                scatter();  // Redraw scatter plot with new axis
            }
        });
    }

    scatter();  // Initial draw of the scatter plot
})

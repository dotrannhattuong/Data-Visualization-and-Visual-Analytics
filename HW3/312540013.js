// Set graph dimensions and margins
const margin = { top: 20, right: 20, bottom: 20, left: 20 },
    width = 600 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

// Path to data file
const dataPath = "./abalone.data";

// Load data
d3.text(dataPath).then(function (data) {
    const features = ["Length", "Diameter", "Height", "Whole weight", "Shucked weight", "Viscera weight", "Shell weight", "Rings"];
    let dataMale = [], dataFemale = [], dataInfant = [];

    // Split data into rows
    const rows = data.split("\n");

    // Parse each row and separate by gender
    rows.forEach(row => {
        const cols = row.split(",");
        const featureList = cols.slice(1, 9).map(Number);

        switch (cols[0]) {
            case "M":
                dataMale.push(featureList);
                break;
            case "F":
                dataFemale.push(featureList);
                break;
            case "I":
                dataInfant.push(featureList);
                break;
        }
    });

    // Generate correlation matrices
    const cmMale = calculateCorrelationMatrix(dataMale);
    const cmFemale = calculateCorrelationMatrix(dataFemale);
    const cmInfant = calculateCorrelationMatrix(dataInfant);

    // Render the legend and initial correlation matrix (for males)
    renderLegend();
    renderCorrelationMatrix(cmMale);

    // Add event listener to change matrix based on selected gender
    document.getElementById('sex-select').addEventListener('change', function () {
        switch (this.value) {
            case "male":
                renderCorrelationMatrix(cmMale);
                break;
            case "female":
                renderCorrelationMatrix(cmFemale);
                break;
            case "infant":
                renderCorrelationMatrix(cmInfant);
                break;
        }
    });

    // Function to calculate the correlation matrix
    function calculateCorrelationMatrix(data) {
        const transposedData = math.transpose(data);
        let correlationMatrix = [];

        transposedData.forEach((colX, i) => {
            transposedData.forEach((colY, j) => {
                const corrValue = math.corr(colX, colY);
                correlationMatrix.push({
                    x: features[i],
                    y: features[j],
                    value: +corrValue
                });
            });
        });

        return correlationMatrix;
    }

    // Render the legend
    function renderLegend() {
        const legendTop = 15;
        const legendHeight = 15;

        const legendSvg = d3.select(".legend").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", legendHeight + legendTop + 20)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${legendTop})`);

        const defs = legendSvg.append("defs");

        const gradient = defs.append("linearGradient")
            .attr("id", "linear-gradient");

        const stops = [
            { offset: 0, color: "#00429d", value: -1 },
            { offset: 0.5, color: "#ffffe0", value: 0 },
            { offset: 1, color: "#ff0000", value: 1 }
        ];

        gradient.selectAll("stop")
            .data(stops)
            .enter().append("stop")
            .attr("offset", d => `${100 * d.offset}%`)
            .attr("stop-color", d => d.color);

        legendSvg.append("rect")
            .attr("width", width)
            .attr("height", legendHeight)
            .style("fill", "url(#linear-gradient)");

        legendSvg.selectAll("text")
            .data(stops)
            .enter().append("text")
            .attr("x", d => width * d.offset)
            .attr("dy", -3)
            .style("text-anchor", (d, i) => (i === 0 ? "start" : i === 1 ? "middle" : "end"))
            .text(d => d.value.toFixed(2))
            .style("font-size", 12);
    }

    // Render the correlation matrix
    function renderCorrelationMatrix(correlationMatrix) {
        // Clean previous matrix
        d3.select("#cm").select('svg').remove();

        // Get unique variables for axes
        const variables = Array.from(new Set(correlationMatrix.map(d => d.x)));
        const numVars = Math.sqrt(correlationMatrix.length);

        // Define scales for color and size
        const colorScale = d3.scaleLinear()
            .domain([-1, 0, 1])
            .range(["#00429d", "#ffffe0", "#ff0000"]);

        const sizeScale = d3.scaleSqrt()
            .domain([0, 1])
            .range([0, 12]);

        // Create X and Y scales
        const xScale = d3.scalePoint().range([0, width]).domain(variables);
        const yScale = d3.scalePoint().range([0, height]).domain(variables);

        // Create SVG container for the matrix
        const svg = d3.select("#cm").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Create one group element per correlation cell
        const correlationGroups = svg.selectAll(".cor")
            .data(correlationMatrix)
            .join("g")
            .attr("class", "cor")
            .attr("transform", d => `translate(${xScale(d.x)}, ${yScale(d.y)})`);

        // Add text for lower diagonal and diagonal (with color)
        correlationGroups.filter(d => variables.indexOf(d.x) <= variables.indexOf(d.y))
            .append("text")
            .attr("y", 5)
            .text(d => (d.x === d.y ? d.x : d.value.toFixed(2)))
            .style("font-size", 12)
            .attr("text-anchor", "middle")
            .style("fill", d => (d.x === d.y ? "#000" : colorScale(d.value)));

        // Add circles for upper diagonal
        correlationGroups.filter(d => variables.indexOf(d.x) > variables.indexOf(d.y))
            .append("circle")
            .attr("r", d => sizeScale(Math.abs(d.value)))
            .style("fill", d => colorScale(d.value))
            .style("opacity", 0.8);
    }
});

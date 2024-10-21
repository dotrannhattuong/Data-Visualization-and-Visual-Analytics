// Path to the CSV file containing the data to be visualized
const csvFilePath = "./Measurement_summary.csv";

// Load the CSV data using d3 library
d3.csv(csvFilePath).then(function (pollutionData) {

    /**
     * Rounds a given number to a specified number of decimal places
     * @param {number} number - The number to be rounded
     * @param {number} decimalPlaces - The number of decimal places
     * @returns {number} - The rounded number
     */
    const roundToDecimalPlaces = (number, decimalPlaces) => {
        return Math.round((number + Number.EPSILON) * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
    };

    /**
     * Aggregates the data by date and station for a given pollutant type
     * @param {Array} data - The data to be aggregated
     * @param {string} pollutantType - The pollutant type to aggregate (e.g., 'SO2', 'NO2')
     * @returns {Array} - The aggregated data
     */
    function aggregateDataByDateAndStation(data, pollutantType) {
        // Reduce the data to aggregate values by date and station
        let aggregatedData = data.reduce((accumulator, record) => {
            let measurementDate = record["Measurement date"].split(" ")[0];
            let stationCode = record["Station code"];

            // Initialize entry for date and station if it doesn't exist
            if (!accumulator[measurementDate]) accumulator[measurementDate] = {};
            if (!accumulator[measurementDate][stationCode]) accumulator[measurementDate][stationCode] = { sum: 0, count: 0 };

            // Accumulate the sum and increment the count for averaging later
            accumulator[measurementDate][stationCode].sum += +record[pollutantType];
            accumulator[measurementDate][stationCode].count++;

            return accumulator;
        }, Object.create(null));

        // Convert aggregated sums into an array format suitable for visualization
        return Object.keys(aggregatedData).map((measurementDate) => {
            return Object.keys(aggregatedData[measurementDate]).map((stationCode) => {
                return {
                    "ts": new Date(measurementDate),  // Timestamp for the measurement date
                    "series": stationCode,            // Series representing the station
                    "val": roundToDecimalPlaces(aggregatedData[measurementDate][stationCode].sum / aggregatedData[measurementDate][stationCode].count, 4), // Averaged value
                };
            });
        });
    }

    // Add event listeners to all radio buttons to detect changes in selected pollutant type
    const radioButtonElements = document.querySelectorAll('input[name="type"]');
    for (const radioButton of radioButtonElements) {
        radioButton.addEventListener('change', handleRadioButtonChange);
    }

    /**
     * Handles changes in radio button selection to render the chart for the selected pollutant
     * @param {Event} event - The change event
     */
    function handleRadioButtonChange(event) {
        if (this.checked) {
            renderHorizonChart(this.value);
        }
    }

    /**
     * Renders the horizon chart for the given pollutant type
     * @param {string} pollutantType - The pollutant type to render (e.g., 'SO2', 'NO2')
     */
    function renderHorizonChart(pollutantType) {
        let aggregatedData = aggregateDataByDateAndStation(pollutionData, pollutantType);
        let flattenedData = [].concat(...aggregatedData); // Flatten the data array

        // Render the horizon chart using the HorizonTSChart library
        HorizonTSChart()(document.getElementById('horizon-chart'))
            .data(flattenedData)
            .series('series');
    }

    // Initial chart render for the default pollutant type ("SO2")
    renderHorizonChart("SO2");
});

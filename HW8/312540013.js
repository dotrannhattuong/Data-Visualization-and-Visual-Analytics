// Define a Sankey layout function
d3.sankey = function () {
    var sankey = {},
        nodeWidth = 24, // Width of each node in the diagram
        nodePadding = 8, // Padding between nodes
        size = [1, 1], // Size of the diagram
        nodes = [], // Array to store node data
        links = [], // Array to store link data between nodes
        attributeOrder = []; // Order of attributes (used for x-position of nodes)

    // Getter/setter for node width
    sankey.nodeWidth = function (_) {
        if (!arguments.length) return nodeWidth;
        nodeWidth = +_;
        return sankey;
    };

    // Getter/setter for node padding
    sankey.nodePadding = function (_) {
        if (!arguments.length) return nodePadding;
        nodePadding = +_;
        return sankey;
    };

    // Getter/setter for nodes array
    sankey.nodes = function (_) {
        if (!arguments.length) return nodes;
        nodes = _;
        return sankey;
    };

    // Getter/setter for links array
    sankey.links = function (_) {
        if (!arguments.length) return links;
        links = _;
        return sankey;
    };

    // Getter/setter for diagram size
    sankey.size = function (_) {
        if (!arguments.length) return size;
        size = _;
        return sankey;
    };

    // Layout function to compute node and link positions
    sankey.layout = function (iterations) {
        computeNodeLinks(); // Compute source and target links for each node
        computeNodeValues(); // Compute the value of each node based on links
        computeNodeBreadths(); // Compute x-position of nodes (breadths)
        computeNodeDepths(iterations); // Compute y-position of nodes (depths)
        computeLinkDepths(); // Compute link depths
        computeColorID(); // Compute color IDs for nodes
        return sankey;
    };

    // Relayout links if needed
    sankey.relayout = function () {
        computeLinkDepths();
        return sankey;
    };

    // Function to create curved paths for links
    sankey.link = function () {
        var curvature = 0.5; // Curvature factor for links

        function link(d) {
            var x0 = d.source.x + d.source.dx, // Source x position
                x1 = d.target.x, // Target x position
                xi = d3.interpolateNumber(x0, x1), // Interpolate between x positions
                x2 = xi(curvature), // Curved x position for the source side
                x3 = xi(1 - curvature), // Curved x position for the target side
                y0 = d.source.y + d.sy + d.dy / 2, // Source y position
                y1 = d.target.y + d.ty + d.dy / 2; // Target y position
            return (
                'M' + x0 + ',' + y0 +
                'C' + x2 + ',' + y0 +
                ' ' + x3 + ',' + y1 +
                ' ' + x1 + ',' + y1
            ); // Return SVG path string for curved link
        }

        // Getter/setter for link curvature
        link.curvature = function (_) {
            if (!arguments.length) return curvature;
            curvature = +_;
            return link;
        };

        return link;
    };

    // Helper functions for the layout

    // Compute the links for each node (sourceLinks and targetLinks)
    function computeNodeLinks() {
        nodes.forEach(function (node) {
            node.sourceLinks = [];
            node.targetLinks = [];
        });
        links.forEach(function (link) {
            var source = link.source,
                target = link.target;
            if (typeof source === 'number') source = link.source = nodes[link.source]; // If source is a number, map to node
            if (typeof target === 'number') target = link.target = nodes[link.target]; // If target is a number, map to node
            source.sourceLinks.push(link);
            target.targetLinks.push(link);
        });
    }

    // Compute the value of each node by summing the source and target link values
    function computeNodeValues() {
        nodes.forEach(function (node) {
            node.value = Math.max(
                d3.sum(node.sourceLinks, value),
                d3.sum(node.targetLinks, value)
            );
        });
    }

    // Compute the x-position (breadth) for each node based on the attribute order
    function computeNodeBreadths() {
        attributeOrder = ['buying', 'maintenance', 'doors', 'persons', 'luggage boot', 'safety'];

        // Iterate through each attribute to set node x-positions
        attributeOrder.forEach(function (attribute, i) {
            var nodesForAttribute = nodes.filter(function (node) {
                return node.name.startsWith(attribute);
            });
            nodesForAttribute.forEach(function (node) {
                node.x = i;
                node.dx = nodeWidth; // Set node width
            });
        });

        // Move sink nodes to the rightmost position
        moveSinksRight(attributeOrder.length);

        // Scale node breadths based on available space
        scaleNodeBreadths((size[0] - nodeWidth) / (attributeOrder.length - 1));
    }

    // Move source nodes to the right if they don't have any target links
    function moveSourcesRight() {
        nodes.forEach(function (node) {
            if (!node.targetLinks.length) {
                node.x = d3.min(node.sourceLinks, function (d) { return d.target.x; }) - 1;
            }
        });
    }

    // Move sink nodes to the rightmost position
    function moveSinksRight(x) {
        nodes.forEach(function (node) {
            if (!node.sourceLinks.length) {
                node.x = x - 1;
            }
        });
    }

    // Scale node x-positions to fit within the diagram width
    function scaleNodeBreadths(kx) {
        nodes.forEach(function (node) {
            node.x *= kx;
        });
    }

    // Compute the y-position (depth) of each node and resolve collisions
    function computeNodeDepths(iterations) {
        var nodesByBreadth = d3.nest()
            .key(function (d) { return d.x; })
            .sortKeys(d3.ascending)
            .entries(nodes)
            .map(function (d) { return d.values; });

        initializeNodeDepth(); // Initialize y-position
        resolveCollisions(); // Resolve node overlaps

        for (var alpha = 1; iterations > 0; --iterations) {
            relaxRightToLeft((alpha *= 0.99)); // Adjust positions from right to left
            resolveCollisions(); // Resolve overlaps
            relaxLeftToRight(alpha); // Adjust positions from left to right
            resolveCollisions(); // Resolve overlaps
        }

        // Set initial y-position and height for nodes
        function initializeNodeDepth() {
            var ky = d3.min(nodesByBreadth, function (nodes) {
                return (size[1] - (nodes.length - 1) * nodePadding) / d3.sum(nodes, value);
            });
            nodesByBreadth.forEach(function (nodes) {
                nodes.forEach(function (node, i) {
                    node.y = i;
                    node.dy = node.value * ky;
                });
            });
            links.forEach(function (link) {
                link.dy = link.value * ky;
            });
        }

        // Relax node positions from left to right
        function relaxLeftToRight(alpha) {
            nodesByBreadth.forEach(function (nodes) {
                nodes.forEach(function (node) {
                    if (node.targetLinks.length) {
                        var y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, value);
                        node.y += (y - center(node)) * alpha;
                    }
                });
            });

            function weightedSource(link) {
                return center(link.source) * link.value;
            }
        }

        // Relax node positions from right to left
        function relaxRightToLeft(alpha) {
            nodesByBreadth.slice().reverse().forEach(function (nodes) {
                nodes.forEach(function (node) {
                    if (node.sourceLinks.length) {
                        var y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, value);
                        node.y += (y - center(node)) * alpha;
                    }
                });
            });

            function weightedTarget(link) {
                return center(link.target) * link.value;
            }
        }

        // Resolve any overlapping nodes
        function resolveCollisions() {
            nodesByBreadth.forEach(function (nodes) {
                var node, dy, y0 = 0, n = nodes.length, i;

                // Push any overlapping nodes down
                nodes.sort(ascendingDepth);
                for (i = 0; i < n; ++i) {
                    node = nodes[i];
                    dy = y0 - node.y;
                    if (dy > 0) node.y += dy;
                    y0 = node.y + node.dy + nodePadding;
                }

                // If the bottommost node goes outside the bounds, push it back up
                dy = y0 - nodePadding - size[1];
                if (dy > 0) {
                    y0 = node.y -= dy;
                    for (i = n - 2; i >= 0; --i) {
                        node = nodes[i];
                        dy = node.y + node.dy + nodePadding - y0;
                        if (dy > 0) node.y -= dy;
                        y0 = node.y;
                    }
                }
            });
        }

        // Sort nodes by y-position
        function ascendingDepth(a, b) {
            return a.y - b.y;
        }
    }

    // Compute the depth of links between nodes
    function computeLinkDepths() {
        nodes.forEach(function (node) {
            node.sourceLinks.sort(ascendingTargetDepth);
            node.targetLinks.sort(ascendingSourceDepth);
        });
        nodes.forEach(function (node) {
            var sy = 0, ty = 0;
            node.sourceLinks.forEach(function (link) {
                link.sy = sy;
                sy += link.dy;
            });
            node.targetLinks.forEach(function (link) {
                link.ty = ty;
                ty += link.dy;
            });
        });

        function ascendingSourceDepth(a, b) {
            return a.source.y - b.source.y;
        }

        function ascendingTargetDepth(a, b) {
            return a.target.y - b.target.y;
        }
    }

    // Compute color IDs for nodes based on their order
    function computeColorID() {
        attributeOrder.forEach(function (attribute) {
            var nodesForAttribute = nodes.filter(function (node) {
                return node.name.startsWith(attribute);
            });

            // Sort nodes by their y-position
            nodesForAttribute.sort((a, b) => a.y - b.y);
            nodesForAttribute.forEach((node, index) => {
                node.cid = index; // Assign color ID based on sorted index
            });
        });
    }

    // Helper function to get the center of a node
    function center(node) {
        return node.y + node.dy / 2;
    }

    // Helper function to get the value of a link
    function value(link) {
        return link.value;
    }

    return sankey;
};

// Create the Sankey diagram using D3.js
(function (d3$1) {
    'use strict';

    const svg = d3$1.select('#sankey-diagram'); // Select the SVG element for the diagram

    const width = +svg.attr('width'); // Get the width of the SVG element
    const height = +svg.attr('height'); // Get the height of the SVG element

    const margin = {
        top: 50,
        right: 50,
        bottom: 100,
        left: 50,
    };

    const diagramWidth = width - margin.left - margin.right;
    const diagramHeight = height - margin.top - margin.bottom;

    // Initialize the Sankey diagram properties
    var sankey = d3
        .sankey()
        .nodeWidth(10)
        .nodePadding(2)
        .size([diagramWidth, diagramHeight]);

    var path = sankey.link(); // Create the link function

    // Function to render the graph
    const render = (graph) => {
        var nodeMap = {};
        graph.nodes.forEach(function (x) {
            nodeMap[x.name] = x;
        });
        graph.links = graph.links.map(function (x) {
            return {
                source: nodeMap[x.source],
                target: nodeMap[x.target],
                value: x.value,
            };
        });

        // Layout the graph
        sankey
            .nodes(graph.nodes)
            .links(graph.links)
            .layout(32);

        const linkGroups = {};
        graph.links.forEach((link) => {
            const key = link.source.name + '-' + link.target.name;
            if (!linkGroups[key]) {
                linkGroups[key] = [];
            }
            linkGroups[key].push(link);
        });

        // Add the link groups
        const band = svg.append('g').selectAll('.band')
            .data(Object.values(linkGroups))
            .enter().append('g')
            .attr('class', 'band');

        // Add the links within each group
        const link = band.selectAll('.link')
            .data((d) => d)
            .enter().append('path')
            .attr('class', 'link')
            .attr('transform', function () {
                return `translate(${margin.left},${margin.top})`;
            })
            .attr('d', path) // Set the path for each link
            .style('stroke-width', function (d) {
                return Math.max(1, d.dy);
            })
            .sort(function (a, b) {
                return b.dy - a.dy;
            });

        // Add titles to the links
        link.append('title').text(function (d) {
            return d.source.name + ' → ' + d.target.name + ': ' + d.value;
        });

        // Define color scales for different attributes
        const colorScales = {
            "buying": ['hsl(0, 100%, 80%)', 'hsl(0, 100%, 70%)', 'hsl(0, 100%, 60%)', 'hsl(0, 100%, 50%)'],
            "maintenance": ['hsl(30, 100%, 80%)', 'hsl(30, 100%, 70%)', 'hsl(30, 100%, 60%)', 'hsl(30, 100%, 50%)'],
            "doors": ['hsl(60, 100%, 80%)', 'hsl(60, 100%, 70%)', 'hsl(60, 100%, 60%)', 'hsl(60, 100%, 50%)'],
            "persons": ['hsl(120, 100%, 70%)', 'hsl(120, 100%, 60%)', 'hsl(120, 100%, 50%)'],
            'luggage boot': ['hsl(180, 100%, 70%)', 'hsl(180, 100%, 60%)', 'hsl(180, 100%, 50%)'],
            "safety": ['hsl(240, 100%, 70%)', 'hsl(240, 100%, 60%)', 'hsl(240, 100%, 50%)'],
        };

        // Add attribute titles
        svg
            .selectAll('.attribute-title')
            .data(graph.nodes.filter((d) => d.cid === 0))
            .enter()
            .append('text')
            .attr('class', 'attribute-title')
            .attr('x', function (d) {
                return margin.left + d.x;
            })
            .attr('y', 30)
            .attr('text-anchor', 'middle')
            .text(function (d) {
                return d.name.split('-')[0];
            });

        // Add the nodes to the diagram
        var node = svg
            .append('g')
            .selectAll('.node')
            .data(graph.nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', function (d) {
                return `translate(${margin.left + d.x},${margin.top + d.y})`;
            })
            .call(
                d3
                    .drag()
                    .subject(function (d) {
                        return d;
                    })
                    .on('start', function () {
                        this.parentNode.appendChild(this); // Bring the dragged node to the front
                    })
                    .on('drag', dragmove)
            );

        // Add rectangles to represent each node
        node
            .append('rect')
            .attr('height', function (d) {
                return d.dy;
            })
            .attr('width', sankey.nodeWidth())
            .style('fill', function (d) {
                const colorScale = colorScales[d.name.split('-')[0]];
                return (d.color = colorScale[d.cid]); // Set node color
            })
            .style('stroke', function (d) {
                return d3.rgb(d.color).darker(2); // Add stroke to node
            })
            .append('title')
            .text(function (d) {
                return d.name;
            });

        // Add labels to the nodes
        node
            .append('text')
            .attr('x', -6)
            .attr('y', function (d) {
                return d.dy / 2;
            })
            .attr('dy', '.35em')
            .attr('text-anchor', 'end')
            .attr('transform', null)
            .text(function (d) {
                return d.label.split('-')[1];
            })
            .filter(function (d) {
                return d.x < width / 2;
            })
            .attr('x', 6 + sankey.nodeWidth())
            .attr('text-anchor', 'start');

        // Function for dragging nodes
        function dragmove(d) {
            d3.select(this).attr(
                'transform',
                `translate(${margin.left + d.x},${margin.top +
                (d.y = Math.max(0, Math.min(diagramHeight, d3.event.y)))})`
            );
            sankey.relayout(); // Recalculate layout after dragging
            link.attr('d', path); // Update link paths
        }
    };

    // Path to load the data file
    const data_path = "car.data";

    // Load the data and render the diagram
    d3$1.text(data_path).then(function (r) {
        var loadedData =
            'buying,maintenance,doors,persons,luggage boot,safety\n' +
            r;
        var data = d3.csvParse(loadedData);

        // Transform data into nodes and links
        const transformData = (d) => {
            const nodesById = {};
            const linksMap = {};
            const column = d.columns;
            const columnLength = column.length;
            const n = columnLength;
            const rowLength = d.length;

            d.forEach((row) => {
                for (var i = 0; i < n - 1; i++) {
                    const source = column[i] + '-' + row[column[i]];
                    const target = column[i + 1] + '-' + row[column[i + 1]];

                    if (target === '' || target === '-') {
                        break;
                    }

                    const linkKey = source + '->' + target;

                    if (!linksMap[linkKey]) {
                        linksMap[linkKey] = {
                            source: source,
                            target: target,
                            value: 0,
                        };
                    }

                    linksMap[linkKey].value += 1;
                    nodesById[source] = true;
                    nodesById[target] = true;
                }
            });

            const nodes = Object.keys(nodesById).map((id) => ({
                name: id,
                label: id.substr(0, 20),
            }));

            const links = Object.values(linksMap);

            return { nodes: nodes, links: links };
        };

        const transformedData = transformData(data);
        render(transformedData); // Render the Sankey diagram with transformed data
    });

}(d3));
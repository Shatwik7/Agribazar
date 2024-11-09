
    async function fetchUserTypeChart() {
        try {
            const response = await fetch('/admin/api/userTypeChart');
            const data = await response.json();
            console.log(data);
            const labels = data.map(item => item.user_type); 
            const counts = data.map(item => item.user_count);
            const colors = labels.map(() => generateRandomColor());
            const chartData = {
                labels: labels,
                datasets: [{
                    label: 'User Type Distribution',
                    data: counts,
                    hoverOffset: 4
                }]
            };
            const config = {
                type: 'doughnut',
                data: chartData,
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(tooltipItem) {
                                    return tooltipItem.label + ': ' + tooltipItem.raw + ' users';
                                }
                            }
                        }
                    }
                }
            };
            const userTypeChart = new Chart(
                document.getElementById('userTypeChartCircular'), 
                config
            );
        } catch (error) {
            console.error('Error fetching user type chart data:', error);
        }
    }
    function generateRandomColor() {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        return `rgb(${r}, ${g}, ${b})`;
    }
    fetchUserTypeChart();
    async function fetchcropTypeChart() {
        try {
            const response = await fetch('/admin/api/cropTypeChart');
            const data = await response.json();
            const labels = data.map(item => item.product_name); 
            const counts = data.map(item => item.product_count);
            const colors = labels.map(() => generateRandomColor());
            const chartData = {
                labels: labels,
                datasets: [{
                    label: 'Product Count',
                    data: counts,
                    hoverOffset: 4
                }]
            };
            const config = {
                type: 'doughnut',
                data: chartData,
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display:false,
                        },
                        tooltip: {
                            callbacks: {
                                label: function(tooltipItem) {
                                    return tooltipItem.label + ': ' + tooltipItem.raw + ' items';
                                }
                            }
                        }
                    }
                }
            };
            const cropChart = new Chart(
                document.getElementById('cropTypeChartCircular'),
                config
            );

        } catch (error) {
            console.error('Error fetching crop type chart data:', error);
        }
    }
    function generateRandomColor() {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        return `rgb(${r}, ${g}, ${b})`;
    }
    fetchcropTypeChart();
    async function fetchBidData() {
        let duration;
        duration='12m';
        let startDate, endDate;
        const today = new Date();
        if (duration === '24h') {
            startDate = new Date(today.setHours(today.getHours() - 24)); // Last 24 hours
        } else if (duration === '7d') {
            startDate = new Date(today.setDate(today.getDate() - 7)); // Last 7 days
        } else if (duration === '30d') {
            startDate = new Date(today.setDate(today.getDate() - 30)); // Last 30 days
        } else if (duration === '3m') {
            startDate = new Date(today.setDate(today.getDate() - 90)); 
        } else if (duration === '6m') {
            startDate = new Date(today.setDate(today.getDate() - 180)); 
        }else if (duration === '12m') {
            startDate = new Date(today.setDate(today.getDate() - 365)); 
        }
        endDate = new Date(today.setDate(today.getHours() + 24));
        const startDateString = startDate.toISOString().split('T')[0];
        const endDateString = endDate.toISOString().split('T')[0];
        const response = await fetch(`/admin/api/bidAnalytics?startDate=${startDateString}&endDate=${endDateString}`);
        const data = await response.json();
        console.log(data);
        const labels = data.map(item => item.date);
        const bidCounts = data.map(item => item.number_of_bids);
        updateChart(labels, bidCounts);
    }
    const ctx = document.getElementById('bidChart').getContext('2d');
    let bidChart;

    function updateChart(labels, bidCounts) {
        if (bidChart) {
            bidChart.destroy();
        }

        bidChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Number of Bids',
                        data: bidCounts,
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Amount / Bids'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        });
    }

    fetchBidData();
    fetch('/admin/api/analytics')
        .then(response => response.json())
        .then(data => {
            const cropData = data;
            const labels = cropData.map(crop => crop.crop_type);
            const avgPrices = cropData.map(crop => parseFloat(crop.average_starting_price));
            const maxBids = cropData.map(crop => parseFloat(crop.max_bid));

            const chartData = {
                labels: labels,
                datasets: [
                    {
                        label: 'Average Starting Price',
                        data: avgPrices,
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Max Bid Price',
                        data: maxBids,
                        backgroundColor: 'rgba(153, 102, 255, 0.6)',
                        borderColor: 'rgba(153, 102, 255, 1)',
                        borderWidth: 1
                    }
                ]
            };
            const config = {
                type: 'bar',
                data: chartData,
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Price (in currency unit)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Crop Type'
                            }
                        }
                    }
                }
            };
            const cropChart = new Chart(
                document.getElementById('cropChart'),
                config
            );
        })
        .catch(error => {
            console.error('Error fetching crop data:', error);
        });

document.addEventListener('DOMContentLoaded', function () {
    const productsPerPage = 12;
    let currentPage = 1;
    let totalPages = 1;
    const sortDropdownItems = document.querySelectorAll('.dropdown-item');
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');

    async function fetchProducts(sort = '', search = '', page = 1) {
        const loadingElement = document.getElementById('loading');
        const productContainer = document.querySelector('.products-container');
        const paginationContainer = document.querySelector('.pagination');

        loadingElement.style.display = 'block';
        productContainer.innerHTML = '';
        paginationContainer.innerHTML = '';
    
        try {
            const response = await fetch(`/api/products?sort=${sort}&search=${search}&page=${page}&limit=${productsPerPage}`);
            const data = await response.json();
            products = data.products;
            totalPages = data.totalPages;
            renderProducts();
            renderPagination();
        } catch (error) {
            console.error('Error fetching products:', error);
            productContainer.innerHTML = '<p>Error loading products.</p>';
        } finally {
            loadingElement.style.display = 'none';
        }
    }
    

    function renderProducts() {
        const productContainer = document.querySelector('.products-container');
        productContainer.innerHTML = '';

        products.forEach(product => {
            const productCard = `
                <div class="col-md-4 mb-4">
                    <div class="card">
                        <img class="card-img-top" src="${product.image_url}" alt="Product Image">
                        <div class="card-body">
                            <h5 class="card-title">${product.product_name}</h5>
                            <p class="card-text">${truncateContent(product.description, 100)}</p>
                            <p class="card-text">Reserve Price: $${product.reserve_price}</p>
                            <p class="card-text">Starting Price: $${product.starting_price}</p>
                            <a href="/product/${product.product_id}" class="btn btn-primary">See Bids</a>
                        </div>
                    </div>
                </div>
            `;
            productContainer.insertAdjacentHTML('beforeend', productCard);
        });
    }

    function renderPagination() {
        const paginationContainer = document.querySelector('.pagination');
        paginationContainer.innerHTML = '';
    
        const maxVisiblePages = 5; 
    
        if (currentPage > 1) {
            paginationContainer.innerHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" aria-label="Previous" data-page="${currentPage - 1}">
                        <span aria-hidden="true">&laquo;</span>
                    </a>
                </li>
            `;
        }
    
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
    
        for (let i = startPage; i <= endPage; i++) {
            paginationContainer.innerHTML += `
                <li class="page-item ${currentPage === i ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
    
        if (currentPage < totalPages) {
            paginationContainer.innerHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" aria-label="Next" data-page="${currentPage + 1}">
                        <span aria-hidden="true">&raquo;</span>
                    </a>
                </li>
            `;
        }
    }
    

    function truncateContent(content, maxLength) {
        if (content.length > maxLength) {
            return content.substring(0, maxLength) + '...';
        }
        return content;
    }

    document.querySelector('.pagination').addEventListener('click', function (event) {
        if (event.target.tagName === 'A') {
            event.preventDefault();
            currentPage = parseInt(event.target.getAttribute('data-page'));
            fetchProducts('', searchInput.value, currentPage);
        }
    });

    sortDropdownItems.forEach(item => {
        item.addEventListener('click', function (event) {
            event.preventDefault();
            const sortOption = event.target.getAttribute('href').split('=')[1];
            fetchProducts(sortOption, searchInput.value, 1);
        });
    });
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }
    searchInput.addEventListener('input', debounce(function (event) {
        fetchProducts('', searchInput.value, 1);
    }, 500));
    fetchProducts();
    const urlParams = new URLSearchParams(window.location.search);
    const prevSearchQuery = urlParams.get('search');
    if (prevSearchQuery) {
        searchInput.value = prevSearchQuery;
    }
});
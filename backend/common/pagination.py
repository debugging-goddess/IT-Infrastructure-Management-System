from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """
    Page-number pagination that honours ?page_size=N (up to 500).

    The frontend sends page_size for its tables and for dropdown option lists; without
    page_size_query_param DRF silently ignores it and always returns 50 rows.
    """

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 500

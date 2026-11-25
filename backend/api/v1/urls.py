from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.infrastructure.views import ServerViewSet, ClusterViewSet, VirtualMachineViewSet
from apps.network.views import VLANViewSet, SubnetViewSet, IPAddressViewSet
from apps.software.views import ApplicationViewSet, ServiceViewSet
from apps.users.views import UserViewSet
from apps.audit.views import AuditLogViewSet
from apps.dashboard.views import DashboardStatsView, DashboardTopologyView

router = DefaultRouter()

# Infrastructure
router.register(r"servers", ServerViewSet, basename="server")
router.register(r"clusters", ClusterViewSet, basename="cluster")
router.register(r"virtual-machines", VirtualMachineViewSet, basename="virtualmachine")

# Network
router.register(r"vlans", VLANViewSet, basename="vlan")
router.register(r"subnets", SubnetViewSet, basename="subnet")
router.register(r"ip-addresses", IPAddressViewSet, basename="ipaddress")

# Software
router.register(r"applications", ApplicationViewSet, basename="application")
router.register(r"services", ServiceViewSet, basename="service")

# Users
router.register(r"users", UserViewSet, basename="user")

# Audit
router.register(r"audit-logs", AuditLogViewSet, basename="auditlog")

urlpatterns = [
    path("", include(router.urls)),

    # Dashboard
    path("dashboard/stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("dashboard/topology/", DashboardTopologyView.as_view(), name="dashboard-topology"),

    # JWT auth
    path("auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

from django.urls import path
from authoring.views.module_views import (
    ModuleCreateView,
    ModuleDetailView,
    StepCreateView,
    StepUpdateDeleteView,
    StepReorderView,
    ModulePublishView,
    ModuleRuntimeView,
)
from authoring.views.asset_views import (
    AssetUploadView,
    AssetListView,
    AssetDeleteView,
    StepAssetAssignView,
    StepAssetDeleteView,
)

urlpatterns = [
    path("modules", ModuleCreateView.as_view(), name="module-create"),
    path("modules/<uuid:pk>", ModuleDetailView.as_view(), name="module-detail"),
    path("modules/<uuid:module_id>/steps", StepCreateView.as_view(), name="step-create"),
    path("steps/<uuid:pk>", StepUpdateDeleteView.as_view(), name="step-detail"),
    path("modules/<uuid:module_id>/steps/reorder", StepReorderView.as_view(), name="step-reorder"),
    path("assets/upload", AssetUploadView.as_view(), name="asset-upload"),
    path("assets", AssetListView.as_view(), name="asset-list"),
    path("assets/<uuid:pk>", AssetDeleteView.as_view(), name="asset-delete"),
    path("steps/<uuid:step_id>/assets", StepAssetAssignView.as_view(), name="step-asset-assign"),
    path("step-assets/<uuid:pk>", StepAssetDeleteView.as_view(), name="step-asset-delete"),
    path("modules/<uuid:module_id>/publish", ModulePublishView.as_view(), name="module-publish"),
    path("modules/<uuid:module_id>/runtime", ModuleRuntimeView.as_view(), name="module-runtime"),
]

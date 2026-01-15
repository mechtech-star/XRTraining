from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from authoring.models import Asset, Step, StepAsset
from authoring.serializers.asset_serializers import AssetUploadSerializer


class AssetUploadView(generics.CreateAPIView):
    """Accept multipart form uploads for assets."""
    queryset = Asset.objects.all()
    serializer_class = AssetUploadSerializer
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        # Debug: log incoming data keys and file keys to help diagnose 400s
        try:
            print("[AssetUpload] request.data keys:", list(request.data.keys()))
            print("[AssetUpload] request.FILES keys:", list(request.FILES.keys()))
        except Exception:
            print("[AssetUpload] failed to inspect request data/files")
        # Proceed with normal CreateAPIView behavior (will return serializer errors if any)
        return super().create(request, *args, **kwargs)


class AssetListView(generics.ListAPIView):
    """List uploaded assets for the UI to display."""
    queryset = Asset.objects.all().order_by('-created_at')
    serializer_class = AssetUploadSerializer


class StepAssetAssignView(APIView):
    def post(self, request, step_id):
        step = get_object_or_404(Step, pk=step_id)
        asset_id = request.data.get("assetId")
        priority = request.data.get("priority", 0)
        if not asset_id:
            return Response({"detail": "assetId is required"}, status=status.HTTP_400_BAD_REQUEST)
        asset = get_object_or_404(Asset, pk=asset_id)
        step_asset, _ = StepAsset.objects.update_or_create(step=step, asset=asset, defaults={"priority": priority})
        return Response({"id": str(step_asset.id), "priority": step_asset.priority, "assetId": str(asset.id)}, status=status.HTTP_201_CREATED)


class StepAssetDeleteView(generics.DestroyAPIView):
    queryset = StepAsset.objects.all()
    lookup_field = "id"

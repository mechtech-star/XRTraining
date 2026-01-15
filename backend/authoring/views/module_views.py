from django.db import models, transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from authoring.models import Module, Step
from authoring.serializers.module_serializers import ModuleSerializer, StepSerializer
from authoring.services.publish_service import publish_module


class ModuleCreateView(generics.ListCreateAPIView):
    queryset = Module.objects.all()
    serializer_class = ModuleSerializer


class ModuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Module.objects.all()
    serializer_class = ModuleSerializer


class StepCreateView(generics.CreateAPIView):
    serializer_class = StepSerializer

    def perform_create(self, serializer):
        module = get_object_or_404(Module, pk=self.kwargs["module_id"])
        last_index = module.steps.aggregate(max_idx=models.Max("order_index")).get("max_idx") or 0
        serializer.save(module=module, order_index=last_index + 1)


class StepUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Step.objects.all()
    serializer_class = StepSerializer


class StepReorderView(APIView):
    def post(self, request, module_id):
        module = get_object_or_404(Module, pk=module_id)
        ordered_ids = request.data.get("orderedStepIds", [])
        step_ids = [str(s.id) for s in module.steps.all()]
        if len(ordered_ids) != len(step_ids) or set(ordered_ids) != set(step_ids):
            return Response({"detail": "orderedStepIds must match module steps"}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            for idx, step_id in enumerate(ordered_ids):
                Step.objects.filter(pk=step_id, module=module).update(order_index=idx + 1)
        return Response({"detail": "reordered"}, status=status.HTTP_200_OK)


class ModulePublishView(APIView):
    def post(self, request, module_id):
        module = get_object_or_404(Module, pk=module_id)
        try:
            published = publish_module(module)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"id": str(published.id), "version": published.version}, status=status.HTTP_201_CREATED)


class ModuleRuntimeView(APIView):
    def get(self, request, module_id):
        module = get_object_or_404(Module, pk=module_id)
        latest = module.published_versions.order_by("-version").first()
        if not latest:
            return Response({"detail": "Module not yet published"}, status=status.HTTP_404_NOT_FOUND)
        return Response(latest.payload, status=status.HTTP_200_OK)

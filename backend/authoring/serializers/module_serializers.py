from rest_framework import serializers
from authoring.models import Module, Step, StepAsset, Asset


class StepAssetInlineSerializer(serializers.ModelSerializer):
    asset = serializers.PrimaryKeyRelatedField(queryset=Asset.objects.all())

    class Meta:
        model = StepAsset
        fields = ["id", "asset", "priority"]


class StepSerializer(serializers.ModelSerializer):
    step_assets = StepAssetInlineSerializer(many=True, required=False)

    class Meta:
        model = Step
        fields = ["id", "module", "order_index", "title", "body", "required", "created_at", "updated_at", "step_assets"]
        read_only_fields = ["created_at", "updated_at", "module", "order_index"]


class ModuleSerializer(serializers.ModelSerializer):
    steps = StepSerializer(many=True, read_only=True)
    cover_asset = serializers.PrimaryKeyRelatedField(queryset=Asset.objects.all(), allow_null=True, required=False)

    class Meta:
        model = Module
        fields = [
            "id",
            "title",
            "description",
            "cover_asset",
            "status",
            "version",
            "created_at",
            "updated_at",
            "steps",
        ]
        read_only_fields = ["status", "version", "created_at", "updated_at"]

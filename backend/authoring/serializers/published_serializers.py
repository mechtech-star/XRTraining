from rest_framework import serializers
from authoring.models import PublishedModule


class PublishedModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublishedModule
        fields = ["id", "module", "version", "schema_version", "payload", "published_at"]
        read_only_fields = fields

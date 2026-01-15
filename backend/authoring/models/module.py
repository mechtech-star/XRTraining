import uuid
from django.db import models
from .asset import Asset


class Module(models.Model):
    STATUS_CHOICES = (
        ("draft", "Draft"),
        ("published", "Published"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    cover_asset = models.ForeignKey(Asset, null=True, blank=True, on_delete=models.SET_NULL, related_name="cover_for_modules")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    version = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:  # pragma: no cover
        return f"Module({self.title})"

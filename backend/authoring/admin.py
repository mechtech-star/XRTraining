from django.contrib import admin
from .models import Asset, Module, Step, StepAsset, PublishedModule


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ("id", "original_filename", "type", "mime_type", "size_bytes", "created_at")
    search_fields = ("original_filename", "mime_type")


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "status", "version", "created_at", "updated_at")
    search_fields = ("title",)


@admin.register(Step)
class StepAdmin(admin.ModelAdmin):
    list_display = ("id", "module", "order_index", "title", "required", "created_at")
    list_filter = ("module",)


@admin.register(StepAsset)
class StepAssetAdmin(admin.ModelAdmin):
    list_display = ("id", "step", "asset", "priority")
    list_filter = ("step",)


@admin.register(PublishedModule)
class PublishedModuleAdmin(admin.ModelAdmin):
    list_display = ("id", "module", "version", "schema_version", "published_at")
    list_filter = ("module",)

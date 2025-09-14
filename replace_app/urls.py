from django.urls import path
from .views import smart_context_replace

urlpatterns = [
    path('smart-context-replace/', smart_context_replace, name='smart_context_replace')
]

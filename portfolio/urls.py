from django.urls import path
from . import views

urlpatterns = [
    # Landing page view
    path('', views.index_view, name='index'),
    
    # AJAX API endpoints
    path('api/gallery/', views.api_gallery_list, name='api_gallery_list'),
    path('api/contact/', views.api_contact_submit, name='api_contact_submit'),
    path('api/login/', views.api_login, name='api_login'),
    path('api/logout/', views.api_logout, name='api_logout'),
    path('api/gallery/upload/', views.api_gallery_upload, name='api_gallery_upload'),
    path('api/gallery/toggle/', views.api_gallery_toggle, name='api_gallery_toggle'),
    path('api/gallery/delete/', views.api_gallery_delete, name='api_gallery_delete'),
    path('api/gallery/clear_all/', views.api_gallery_clear_all, name='api_gallery_clear_all'),
]

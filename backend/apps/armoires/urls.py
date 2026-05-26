from django.urls import path
from . import views

urlpatterns = [
    path('',                  views.ArmoireListCreateView.as_view(), name='armoire-list'),
    path('<uuid:pk>/',        views.ArmoireDetailView.as_view(),     name='armoire-detail'),
    path('rayons/',           views.RayonListCreateView.as_view(),   name='rayon-list'),
    path('rayons/<uuid:pk>/', views.RayonDetailView.as_view(),       name='rayon-detail'),
]

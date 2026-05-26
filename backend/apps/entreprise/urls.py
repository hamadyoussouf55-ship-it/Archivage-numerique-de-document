from django.urls import path
from . import views

urlpatterns = [
    path('',                        views.EntrepriseListCreateView.as_view(),  name='entreprise-list'),
    path('<uuid:pk>/',              views.EntrepriseDetailView.as_view(),      name='entreprise-detail'),
    path('departements/',           views.DepartementListCreateView.as_view(), name='departement-list'),
    path('departements/<uuid:pk>/', views.DepartementDetailView.as_view(),     name='departement-detail'),
    path('services/',               views.ServiceListCreateView.as_view(),     name='service-list'),
    path('services/<uuid:pk>/',     views.ServiceDetailView.as_view(),         name='service-detail'),
    path('roles/',                  views.RoleListCreateView.as_view(),        name='role-list'),
    path('roles/<uuid:pk>/',        views.RoleDetailView.as_view(),            name='role-detail'),
]

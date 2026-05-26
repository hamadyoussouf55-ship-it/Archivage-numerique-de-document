from django.urls import path
from . import views

urlpatterns = [
    path('login/',                        views.LoginView.as_view(),               name='login'),
    path('logout/',                       views.LogoutView.as_view(),              name='logout'),
    path('me/',                           views.MeView.as_view(),                  name='me'),
    path('change-password/',              views.ChangePasswordView.as_view(),      name='change-password'),
    path('collaborateurs/',               views.CollaborateurListCreateView.as_view(), name='collaborateurs-list'),
    path('collaborateurs/<uuid:pk>/',     views.CollaborateurDetailView.as_view(), name='collaborateurs-detail'),
]

import json
from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_POST, require_GET
from .models import GalleryItem, ContactMessage

def index_view(request):
    """
    Renders the main page. Django will auto-inject the CSRF token.
    We pre-serialize and bootstrap the gallery data to eliminate page-load API round-trips.
    """
    items = GalleryItem.objects.all()
    items_list = []
    for item in items:
        items_list.append({
            'id': str(item.id),
            'src': item.image.url,
            'category': item.category,
            'title': item.title or '',
            'desc': item.description or '',
            'visible': item.is_visible,
            'order': item.order,
            'ts': int(item.created_at.timestamp() * 1000) if item.created_at else 0
        })
    import json
    return render(request, 'portfolio/index.html', {
        'gallery_items_json': json.dumps(items_list)
    })


@require_GET
def api_gallery_list(request):
    """
    Returns JSON array of all gallery items.
    Visible on the front-end, hidden visible in admin.
    """
    items = GalleryItem.objects.all()
    items_list = []
    for item in items:
        items_list.append({
            'id': str(item.id),
            'src': item.image.url,
            'category': item.category,
            'title': item.title or '',
            'desc': item.description or '',
            'visible': item.is_visible,
            'order': item.order,
            'ts': int(item.created_at.timestamp() * 1000) if item.created_at else 0
        })
    return JsonResponse(items_list, safe=False)


@require_POST
def api_contact_submit(request):
    """
    Handles secure contact message submissions via AJAX.
    """
    try:
        # Check if JSON or multipart form
        if request.content_type == 'application/json':
            data = json.loads(request.body)
            name = data.get('name', '').strip()
            email = data.get('email', '').strip()
            phone = data.get('phone', '').strip()
            message = data.get('message', '').strip()
        else:
            name = request.POST.get('name', '').strip()
            email = request.POST.get('email', '').strip()
            phone = request.POST.get('phone', '').strip()
            message = request.POST.get('message', '').strip()

        if not name or not email or not message:
            return JsonResponse({'status': 'error', 'message': 'Missing required fields (name, email, message).'}, status=400)

        msg = ContactMessage.objects.create(
            name=name,
            email=email,
            phone=phone,
            message=message
        )
        return JsonResponse({'status': 'success', 'message': 'Message sent successfully!', 'id': msg.id})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@require_POST
def api_login(request):
    """
    Verifies user credentials using Django's secure authentication system.
    """
    try:
        data = json.loads(request.body)
        password = data.get('password', '')
        
        # We will check if there is an admin user.
        # If no superuser exists yet, or for simplicity, we allow authentication of a user named 'admin'
        # Django standard: authenticate with username and password.
        username = data.get('username', 'admin')  # default username to 'admin'
        
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return JsonResponse({'status': 'success', 'message': 'Authenticated successfully!'})
            
        # Fallback helper: if the database has NO users, and this is the first run,
        # we can provide a helpful warning, or if password matches a fallback (only for local dev, but let's be strictly secure).
        # We want to encourage setting up a proper superuser, so we return incorrect credentials.
        return JsonResponse({'status': 'error', 'message': 'Invalid credentials. Create an admin user using createsuperuser.'}, status=401)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@require_POST
@login_required
def api_logout(request):
    """
    Log out the admin user and invalidate session.
    """
    logout(request)
    return JsonResponse({'status': 'success', 'message': 'Logged out successfully!'})


@require_POST
def api_gallery_upload(request):
    """
    Handles uploading new gallery images. Admin restricted.
    Expects standard FormData request.
    """
    if not request.user.is_authenticated:
        return JsonResponse({'status': 'error', 'message': 'Session expired or unauthorized. Please log in again.'}, status=401)
    if not request.user.is_staff:
        return JsonResponse({'status': 'error', 'message': 'Permission denied.'}, status=403)
        
    try:
        image_file = request.FILES.get('image')
        category = request.POST.get('category', 'villas')
        title = request.POST.get('title', '').strip()
        description = request.POST.get('description', '').strip()

        if not image_file:
            return JsonResponse({'status': 'error', 'message': 'No image file uploaded.'}, status=400)

        # Create new record in SQL database
        item = GalleryItem.objects.create(
            title=title,
            category=category,
            image=image_file,
            description=description,
            is_visible=True,
            order=GalleryItem.objects.count()
        )

        return JsonResponse({
            'status': 'success',
            'item': {
                'id': str(item.id),
                'src': item.image.url,
                'category': item.category,
                'title': item.title or '',
                'desc': item.description or '',
                'visible': item.is_visible,
                'order': item.order,
                'ts': int(item.created_at.timestamp() * 1000)
            }
        })
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@require_POST
def api_gallery_toggle(request):
    """
    Toggles visibility of a gallery item. Admin restricted.
    """
    if not request.user.is_authenticated:
        return JsonResponse({'status': 'error', 'message': 'Session expired or unauthorized. Please log in again.'}, status=401)
    if not request.user.is_staff:
        return JsonResponse({'status': 'error', 'message': 'Permission denied.'}, status=403)
        
    try:
        data = json.loads(request.body)
        item_id = data.get('id')
        item = GalleryItem.objects.get(id=item_id)
        item.is_visible = not item.is_visible
        item.save()
        
        return JsonResponse({'status': 'success', 'visible': item.is_visible})
    except GalleryItem.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Gallery item not found.'}, status=404)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@require_POST
def api_gallery_delete(request):
    """
    Deletes a gallery item and its image file. Admin restricted.
    """
    if not request.user.is_authenticated:
        return JsonResponse({'status': 'error', 'message': 'Session expired or unauthorized. Please log in again.'}, status=401)
    if not request.user.is_staff:
        return JsonResponse({'status': 'error', 'message': 'Permission denied.'}, status=403)
        
    try:
        data = json.loads(request.body)
        item_id = data.get('id')
        item = GalleryItem.objects.get(id=item_id)
        
        # Delete file from storage and delete record from DB
        item.image.delete(save=False)
        item.delete()
        
        return JsonResponse({'status': 'success', 'message': 'Image deleted from database and file system.'})
    except GalleryItem.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Gallery item not found.'}, status=404)

    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@require_POST
def api_gallery_clear_all(request):
    """
    Deletes all gallery items and image files. Admin restricted.
    """
    if not request.user.is_authenticated:
        return JsonResponse({'status': 'error', 'message': 'Session expired or unauthorized. Please log in again.'}, status=401)
    if not request.user.is_staff:
        return JsonResponse({'status': 'error', 'message': 'Permission denied.'}, status=403)
        
    try:
        items = GalleryItem.objects.all()
        count = items.count()
        for item in items:
            item.image.delete(save=False)
            item.delete()
        return JsonResponse({'status': 'success', 'message': f'Cleared all {count} images.'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

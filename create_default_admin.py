import os
import django

def create_admin():
    os.environ['DJANGO_SETTINGS_MODULE'] = 'ruthra_project.settings'
    django.setup()
    
    from django.contrib.auth.models import User
    
    username = 'admin'
    email = 'admin@example.com'
    password = 'adminpassword'
    
    if not User.objects.filter(username=username).exists():
        User.objects.create_superuser(username, email, password)
        print("\n" + "="*60)
        print("✓ SECURE SUPERUSER INSTALLED SUCCESSFULLY!")
        print(f"  • Username: {username}")
        print(f"  • Password: {password}")
        print("  You can use these details to log in to BOTH the front-end")
        print("  Gallery Panel and the Django Admin portal at http://127.0.0.1:8000/admin/")
        print("="*60 + "\n")
    else:
        print("\n✓ Admin user 'admin' already exists in SQL database.\n")

if __name__ == '__main__':
    create_admin()

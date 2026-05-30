import os
import sys
from pathlib import Path

# Set up Django environment
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ruthra_project.settings')

# Helper to read .env file manually
def load_env_file():
    env_path = BASE_DIR / '.env'
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    if '=' in line:
                        key, val = line.split('=', 1)
                        os.environ[key.strip()] = val.strip().strip('"').strip("'")

# Try loading from .env
load_env_file()

# Check if environment variables are set
cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME')
api_key = os.environ.get('CLOUDINARY_API_KEY')
api_secret = os.environ.get('CLOUDINARY_API_SECRET')

if not (cloud_name and api_key and api_secret):
    print("=" * 60)
    print("           CLOUDINARY CREDENTIALS REQUIRED")
    print("=" * 60)
    print("Please provide your Cloudinary credentials.")
    print("These can be found on your Cloudinary dashboard.\n")
    
    if not cloud_name:
        cloud_name = input("Enter your Cloudinary Cloud Name: ").strip()
    if not api_key:
        api_key = input("Enter your Cloudinary API Key: ").strip()
    if not api_secret:
        api_secret = input("Enter your Cloudinary API Secret: ").strip()
        
    if not (cloud_name and api_key and api_secret):
        print("\n✗ Error: All credentials must be provided. Exiting.")
        sys.exit(1)
        
    # Write to .env file
    env_path = BASE_DIR / '.env'
    with open(env_path, 'w', encoding='utf-8') as f:
        f.write(f"CLOUDINARY_CLOUD_NAME={cloud_name}\n")
        f.write(f"CLOUDINARY_API_KEY={api_key}\n")
        f.write(f"CLOUDINARY_API_SECRET={api_secret}\n")
    print(f"\n✓ Saved credentials to local .env file.")
    
    # Set them in the current environment
    os.environ['CLOUDINARY_CLOUD_NAME'] = cloud_name
    os.environ['CLOUDINARY_API_KEY'] = api_key
    os.environ['CLOUDINARY_API_SECRET'] = api_secret

# Initialize Django
import django
django.setup()

from django.conf import settings
from django.core.files import File
from portfolio.models import GalleryItem

def main():
    print("\n" + "=" * 60)
    print("           UPLOADING GALLERY IMAGES TO CLOUDINARY")
    print("=" * 60)
    
    items = GalleryItem.objects.all()
    if not items.exists():
        print("No items found in the database. Add some items first!")
        return

    success_count = 0
    fail_count = 0
    
    for item in items:
        img_name = item.image.name
        print(f"\nProcessing Item ID {item.id}: '{item.title or 'No Title'}'")
        print(f"  - Database image name: {img_name}")
        
        # Try to find file locally
        local_path = os.path.join(settings.MEDIA_ROOT, img_name)
        if not os.path.exists(local_path):
            # Try to see if it's in the root media folder without gallery prefix or something
            base_filename = os.path.basename(img_name)
            alternative_path = os.path.join(settings.MEDIA_ROOT, 'gallery', base_filename)
            if os.path.exists(alternative_path):
                local_path = alternative_path
            else:
                print(f"  ✗ Local file not found at: {local_path}")
                fail_count += 1
                continue
                
        print(f"  - Found local file at: {local_path}")
        print("  - Uploading to Cloudinary...")
        
        try:
            with open(local_path, 'rb') as f:
                # We save with the same filename. Django's storage API will automatically
                # upload it using MediaCloudinaryStorage and update the DB record.
                item.image.save(os.path.basename(img_name), File(f), save=True)
            
            # Re-fetch from DB to get the new Cloudinary url
            item.refresh_from_db()
            print(f"  ✓ Uploaded successfully! Cloudinary URL: {item.image.url}")
            success_count += 1
        except Exception as e:
            print(f"  ✗ Upload failed: {str(e)}")
            fail_count += 1

    print("\n" + "=" * 60)
    print("                       SUMMARY")
    print("=" * 60)
    print(f"Successful Uploads: {success_count}")
    print(f"Failed Uploads:     {fail_count}")
    print("=" * 60)
    
    if success_count > 0:
        print("\nWhat to do next:")
        print("1. Your local db.sqlite3 database has been updated with Cloudinary paths.")
        print("2. Commit and push db.sqlite3 to your GitHub repository so Render receives the updated database.")
        print("3. In your Render Dashboard, add these 3 Environment Variables under settings:")
        print(f"   • CLOUDINARY_CLOUD_NAME = {os.environ['CLOUDINARY_CLOUD_NAME']}")
        print(f"   • CLOUDINARY_API_KEY = {os.environ['CLOUDINARY_API_KEY']}")
        print(f"   • CLOUDINARY_API_SECRET = {os.environ['CLOUDINARY_API_SECRET']}")
        print("4. Re-deploy the website on Render and enjoy!")

if __name__ == '__main__':
    main()

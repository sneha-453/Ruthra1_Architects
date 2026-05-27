import os
import shutil

def migrate_assets():
    # Workspace base directory
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Original assets paths
    original_css = os.path.join(base_dir, 'Ruthra', 'style.css')
    
    # Target assets paths
    dest_css_dir = os.path.join(base_dir, 'portfolio', 'static', 'portfolio', 'css')
    dest_js_dir = os.path.join(base_dir, 'portfolio', 'static', 'portfolio', 'js')
    
    # Ensure target directories exist
    os.makedirs(dest_css_dir, exist_ok=True)
    os.makedirs(dest_js_dir, exist_ok=True)
    
    # Copy CSS
    if os.path.exists(original_css):
        shutil.copy2(original_css, os.path.join(dest_css_dir, 'style.css'))
        print("✓ Successfully migrated style.css to Django portfolio static folder.")
    else:
        print(f"✗ Warning: Original style.css not found at: {original_css}")

if __name__ == '__main__':
    migrate_assets()

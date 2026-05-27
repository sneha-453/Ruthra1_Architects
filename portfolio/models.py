from django.db import models

class GalleryItem(models.Model):
    CATEGORY_CHOICES = [
        ('villas', 'Villas'),
        ('interiors', 'Interiors'),
        ('commercial', 'Commercial'),
        ('renovation', 'Renovation'),
    ]
    
    title = models.CharField(max_length=200, blank=True, null=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='villas')
    image = models.ImageField(upload_to='gallery/')
    description = models.TextField(blank=True, null=True)
    is_visible = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self):
        return self.title or f"{self.get_category_display()} - {self.id}"


class ContactMessage(models.Model):
    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=30)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Message from {self.name} on {self.created_at.strftime('%Y-%m-%d %H:%M')}"

# Metadata Update Guide

## Complete Checklist for Updating Site Metadata

### 1. **Basic Metadata** (app/layout.tsx)
- [ ] Update site title
- [ ] Update description
- [ ] Add keywords
- [ ] Update author information
- [ ] Add Open Graph metadata
- [ ] Add Twitter Card metadata
- [ ] Add verification codes (Google, Bing, etc.)

### 2. **Icons and Images**
- [ ] Replace favicon.ico with your icon
- [ ] Update or create icon.tsx (32x32)
- [ ] Update or create apple-icon.tsx (180x180)
- [ ] Update opengraph-image (1200x630)
- [ ] Update twitter-image (1200x600)
- [ ] Create icon-192.png for PWA
- [ ] Create icon-512.png for PWA

### 3. **SEO Files**
- [ ] Update manifest.ts with your app details
- [ ] Update sitemap.ts with your URLs
- [ ] Update robots.ts with crawling rules

### 4. **Package Information**
- [ ] Update package.json name
- [ ] Update package.json description
- [ ] Update package.json author

### 5. **Page-Specific Metadata** (Optional)
For any page that needs custom metadata, add:

```tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Title - Your Site Name',
  description: 'Page-specific description',
  openGraph: {
    title: 'Page Title',
    description: 'Page-specific description',
  },
}
```

### 6. **Environment Variables**
Add to your .env.local:
```
NEXT_PUBLIC_SITE_URL=https://yoursite.com
NEXT_PUBLIC_SITE_NAME=Your Site Name
```

### 7. **Additional Considerations**
- Update any hardcoded "Recipe and Me" text in components
- Update email templates if they contain site name
- Update legal pages (privacy, terms) with new site name
- Update any API documentation

### 8. **Testing Your Metadata**
1. Use Facebook's Sharing Debugger: https://developers.facebook.com/tools/debug/
2. Use Twitter Card Validator: https://cards-dev.twitter.com/validator
3. Use Google's Rich Results Test: https://search.google.com/test/rich-results
4. Check favicon in different browsers

### 9. **Image Requirements**
- **Favicon**: 16x16, 32x32, or 48x48 pixels
- **Apple Touch Icon**: 180x180 pixels
- **Open Graph Image**: 1200x630 pixels (recommended)
- **Twitter Card Image**: 1200x600 pixels (2:1 ratio)
- **PWA Icons**: 192x192 and 512x512 pixels

### 10. **Remember to:**
- Clear browser cache after updating favicon
- Test on mobile devices
- Verify social media previews
- Check SEO tools after deployment
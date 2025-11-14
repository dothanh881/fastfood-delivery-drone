# Public Assets

## 🖼️ Logo Files

- **favicon.svg** - Icon 64x64 cho browser tab
- **logo192.svg** - Icon 192x192 cho PWA và mobile
- **logo512.svg** - Icon 512x512 cho PWA và splash screen

## 📱 PWA Configuration

- **manifest.json** - PWA manifest file
- **index.html** - Main HTML entry point

## 🎨 Design Assets

All logos feature the FoodFast burger icon with brand colors:
- Primary: #FF3D00 (Red-Orange)
- Secondary: #FFD700 (Gold)
- Accent: #FFC107 (Amber)

## 📂 Folder Structure

```
public/
├── images/
│   └── menu/          # Menu item images
├── favicon.svg        # Browser favicon
├── favicon.ico        # Fallback favicon
├── logo192.svg        # PWA icon (192x192)
├── logo512.svg        # PWA icon (512x512)
├── manifest.json      # PWA manifest
├── index.html         # HTML entry point
└── placeholder-item.svg # Placeholder image for menu items
```

## 🔧 Usage

These files are served directly from the `public` folder and can be accessed via:
- `/favicon.svg`
- `/logo192.svg`
- `/images/menu/...`

In React components, use `%PUBLIC_URL%` prefix:
```html
<img src="%PUBLIC_URL%/logo192.svg" alt="Logo" />
```

# Menu Images Structure

Cấu trúc thư mục hình ảnh cho menu món ăn của FoodFast.

## 📁 Cấu trúc thư mục

```
images/menu/
├── burgers/          # Hình ảnh burger
│   └── veggie-burger.jpg
├── sides/            # Món ăn phụ
│   └── french-fries.jpg
├── chicken/          # Món gà
│   └── chicken-wings.jpg
├── pizza/            # Pizza
├── drinks/           # Đồ uống
├── desserts/         # Tráng miệng
├── japanese/         # Món Nhật
└── salads/           # Salad
```

## 🖼️ Hướng dẫn thêm hình ảnh

### Yêu cầu hình ảnh:
- **Định dạng**: JPG, PNG, WEBP
- **Kích thước đề xuất**: 800x600px hoặc tỷ lệ 4:3
- **Dung lượng**: < 500KB để tối ưu tốc độ load
- **Chất lượng**: Hình ảnh sắc nét, ánh sáng tốt

### Đặt tên file:
- Sử dụng chữ thường, cách nhau bằng dấu gạch ngang
- Ví dụ: `veggie-burger.jpg`, `chicken-wings.jpg`, `french-fries.jpg`
- Tránh sử dụng ký tự đặc biệt, dấu cách

## 📋 Danh sách hình ảnh cần có

### Burgers (burgers/)
- [ ] `veggie-burger.jpg` - Burger chay
- [ ] `classic-burger.jpg` - Burger truyền thống
- [ ] `cheese-burger.jpg` - Burger phô mai
- [ ] `double-burger.jpg` - Burger đôi
- [ ] `deluxe-burger.jpg` - Burger cao cấp
- [ ] `wagyu-burger.jpg` - Burger wagyu

### Sides (sides/)
- [ ] `french-fries.jpg` - Khoai tây chiên
- [ ] `onion-rings.jpg` - Hành tây chiên giòn
- [ ] `truffle-fries.jpg` - Khoai tây truffle
- [ ] `sweet-potato-fries.jpg` - Khoai lang chiên

### Chicken (chicken/)
- [ ] `chicken-wings.jpg` - Cánh gà
- [ ] `fried-chicken.jpg` - Gà rán
- [ ] `chicken-nuggets.jpg` - Gà viên
- [ ] `bbq-chicken.jpg` - Gà nướng BBQ

### Pizza (pizza/)
- [ ] `margherita.jpg` - Pizza Margherita
- [ ] `pepperoni.jpg` - Pizza pepperoni
- [ ] `hawaiian.jpg` - Pizza Hawaii
- [ ] `seafood.jpg` - Pizza hải sản

### Drinks (drinks/)
- [ ] `coke.jpg` - Coca Cola
- [ ] `sprite.jpg` - Sprite
- [ ] `orange-juice.jpg` - Nước cam
- [ ] `milkshake.jpg` - Milkshake
- [ ] `iced-tea.jpg` - Trà đá
- [ ] `coffee.jpg` - Cà phê
- [ ] `smoothie.jpg` - Sinh tố

### Desserts (desserts/)
- [ ] `ice-cream.jpg` - Kem
- [ ] `brownie.jpg` - Brownie
- [ ] `cheesecake.jpg` - Bánh phô mai
- [ ] `apple-pie.jpg` - Bánh táo

### Japanese (japanese/)
- [ ] `sushi-set.jpg` - Set sushi
- [ ] `ramen.jpg` - Ramen
- [ ] `dumplings.jpg` - Há cảo
- [ ] `tempura.jpg` - Tempura

### Salads (salads/)
- [ ] `caesar-salad.jpg` - Salad Caesar
- [ ] `garden-salad.jpg` - Salad vườn
- [ ] `greek-salad.jpg` - Salad Hy Lạp

## 🔗 Sử dụng trong code

### Đường dẫn tương đối (từ public/):
```typescript
const imagePath = '/images/menu/burgers/veggie-burger.jpg';
```

### Đường dẫn tuyệt đối (từ backend):
```typescript
const BACKEND_ORIGIN = 'http://localhost:8081';
const imagePath = `${BACKEND_ORIGIN}/images/menu/burgers/veggie-burger.jpg`;
```

## 🎨 Nguồn hình ảnh miễn phí

Bạn có thể tải hình ảnh từ các nguồn sau:

1. **Unsplash**: https://unsplash.com/s/photos/food
2. **Pexels**: https://www.pexels.com/search/food/
3. **Pixabay**: https://pixabay.com/images/search/food/
4. **Freepik**: https://www.freepik.com/search?format=search&query=food

## ⚡ Tối ưu hình ảnh

Sử dụng các công cụ sau để nén hình ảnh:

- **TinyPNG**: https://tinypng.com/
- **Squoosh**: https://squoosh.app/
- **ImageOptim**: https://imageoptim.com/

## 📝 Lưu ý

- Hình ảnh được serve từ thư mục `public/images/menu/`
- Backend có thể serve từ thư mục `uploads/` hoặc `static/images/`
- Đảm bảo có quyền sử dụng hình ảnh (không vi phạm bản quyền)
- Nên có placeholder image cho trường hợp ảnh không load được

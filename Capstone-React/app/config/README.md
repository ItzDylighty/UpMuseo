# Typography & Color System

Quick reference for using the museum design system in React Native.

## Quick Import

```javascript
import { Typography, Colors } from '../config/fonts';
```

## Typography Examples

```javascript
// HEADINGS - Use for titles and sections
<Text style={styles.title}>Event Title</Text>

const styles = StyleSheet.create({
  title: {
    ...Typography.heading1,        // Merriweather Bold, 24px
    color: Colors.textPrimary,
  },
});

// BODY TEXT - Use for descriptions and content
<Text style={styles.description}>Event description...</Text>

const styles = StyleSheet.create({
  description: {
    ...Typography.bodyLarge,       // Inter Regular, 16px, line-height 24
    color: Colors.textSecondary,
  },
});

// BUTTONS - Use for button text
<Text style={styles.buttonText}>Join Event</Text>

const styles = StyleSheet.create({
  buttonText: {
    ...Typography.button,          // Inter SemiBold, 16px, letter-spacing 0.5
    color: Colors.white,
  },
});

// BADGES - Use for status indicators
<Text style={styles.badge}>LIVE</Text>

const styles = StyleSheet.create({
  badge: {
    ...Typography.badge,           // Inter Bold, 10px, uppercase
    color: Colors.textPrimary,
  },
});
```

## Color Examples

```javascript
// Text Colors
color: Colors.textPrimary      // #1a0f08 - Main text (rich black)
color: Colors.textSecondary    // #3d2817 - Secondary text (dark brown)
color: Colors.textMuted        // #7d6b4f - Muted text (medium brown)

// Background Colors
backgroundColor: Colors.white   // #f8f5f0 - Off-white
backgroundColor: Colors.cream   // #f5f2ed - Cream
backgroundColor: Colors.accent  // #d4b48a - Museum gold

// Accent Colors
color: Colors.accent           // #d4b48a - Primary accent
color: Colors.gold             // #d4b48a - Gold accent
borderColor: Colors.accent     // For borders
```

## Full Typography Reference

| Style | Font | Size | Weight | Use Case |
|-------|------|------|--------|----------|
| `displayLarge` | Playfair Display | 48px | Bold | Hero headings |
| `displayMedium` | Playfair Display | 36px | Bold | Page titles |
| `displaySmall` | Playfair Display | 28px | SemiBold | Section titles |
| `heading1` | Merriweather | 24px | Bold | Main headings |
| `heading2` | Merriweather | 20px | Bold | Sub headings |
| `heading3` | Merriweather | 18px | Bold | Card titles |
| `heading4` | Merriweather | 16px | Regular | Small headings |
| `bodyLarge` | Inter | 16px | Regular | Main content |
| `bodyMedium` | Inter | 14px | Regular | Secondary content |
| `bodySmall` | Inter | 12px | Regular | Captions |
| `button` | Inter | 16px | SemiBold | Button text |
| `buttonSmall` | Inter | 14px | SemiBold | Small buttons |
| `label` | Inter | 14px | Medium | Form labels |
| `caption` | Inter | 12px | Regular | Image captions |
| `badge` | Inter | 10px | Bold | Status badges |

## Museum Color Palette

### Primary Colors
- `Colors.primary` - #6e4a2e (Deep brown)
- `Colors.primaryLight` - #8b5a3c
- `Colors.primaryDark` - #5a3d26

### Neutrals
- `Colors.white` - #f8f5f0 (Off-white)
- `Colors.cream` - #f5f2ed
- `Colors.parchment` - #f2efea

### Grays (Brown-toned)
- `Colors.gray50` to `Colors.gray900` - Brown-toned grays

### Accent/Gold
- `Colors.accent` - #d4b48a (Museum gold)
- `Colors.gold` - #d4b48a
- `Colors.goldDark` - #b8956f
- `Colors.goldLight` - #e6d7c3

### Text Colors (Recommended)
- `Colors.textPrimary` - #1a0f08 (Rich black for main text)
- `Colors.textSecondary` - #3d2817 (Dark brown for secondary)
- `Colors.textMuted` - #7d6b4f (Muted brown for hints)
- `Colors.textInverse` - #f8f5f0 (Light text on dark backgrounds)
- `Colors.textAccent` - #6e4a2e (Accent text)

### Semantic Colors
- `Colors.success` - #7d8471 (Muted green)
- `Colors.warning` - #d4b48a (Gold)
- `Colors.error` - #a0522d (Sienna)
- `Colors.info` - #8b7355 (Muted brown)
